import { NextRequest, NextResponse } from "next/server";
import * as UserDAL from "../../../../src/lib/dal/users";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await UserDAL.findByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: "Account with this email already exists." }, { status: 409 });
    }

    // Securely hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user record in SurrealDB
    const newUser = await UserDAL.create({
      name,
      email,
      password: hashedPassword,
      role: 'student', // Default role for onboarding
      isVerified: true // Auto-verify for POC
    });

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });

  } catch (error: any) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
