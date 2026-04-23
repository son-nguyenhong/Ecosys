"""
Reset admin password & verify login flow
Run from project root: python fix_admin.py
"""
import asyncio
import sys
import os

# Add backend/ppg to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend', 'ppg'))

import bcrypt
import asyncpg


async def main():
    print("=" * 60)
    print("  VIB Ecosys - Admin Password Reset & Verify")
    print("=" * 60)

    # Step 1: Connect to DB
    print("\n[1/4] Connecting to database...")
    try:
        conn = await asyncpg.connect(
            host="127.0.0.1",
            user="devops",
            password="devops123",
            database="devops_hub",
        )
        print("  OK - Connected to devops_hub")
    except Exception as e:
        print(f"  FAIL - Cannot connect: {e}")
        print("  Make sure PostgreSQL is running!")
        return

    # Step 2: Check current admin user
    print("\n[2/4] Checking admin user...")
    row = await conn.fetchrow(
        "SELECT username, full_name, email, password_hash, is_active FROM ppg_users WHERE username = 'admin'"
    )
    if not row:
        print("  FAIL - User 'admin' not found in ppg_users!")
        print("  Run migrate.bat first.")
        await conn.close()
        return

    print(f"  Found: {row['username']} | {row['full_name']} | {row['email']}")
    print(f"  is_active: {row['is_active']}")
    print(f"  password_hash length: {len(row['password_hash'])}")
    print(f"  password_hash: {row['password_hash'][:20]}...")

    # Step 3: Verify current hash matches admin123
    print("\n[3/4] Verifying password 'admin123' against stored hash...")
    password = b"admin123"
    try:
        match = bcrypt.checkpw(password, row['password_hash'].encode())
        print(f"  Password match: {match}")
    except Exception as e:
        print(f"  ERROR during verification: {e}")
        match = False

    if not match:
        print("\n  Hash does NOT match 'admin123'. Resetting...")
        # Use the original hash from init.sql
        original_hash = "$2b$12$8C92m.jhLDdHzDkO39TK0e/LH9/SAlgZA0lYHbssRsvg5/BDHtiGe"

        # Verify original hash works
        original_match = bcrypt.checkpw(password, original_hash.encode())
        print(f"  Original seed hash matches admin123: {original_match}")

        if original_match:
            await conn.execute(
                "UPDATE ppg_users SET password_hash = $1 WHERE username = 'admin'",
                original_hash,
            )
            print("  OK - Password reset to original seed hash")
        else:
            # Generate fresh hash
            new_hash = bcrypt.hashpw(password, bcrypt.gensalt()).decode()
            await conn.execute(
                "UPDATE ppg_users SET password_hash = $1 WHERE username = 'admin'",
                new_hash,
            )
            print(f"  OK - Password reset with new hash: {new_hash[:20]}...")

        # Also make sure is_active is true
        await conn.execute(
            "UPDATE ppg_users SET is_active = true WHERE username = 'admin'"
        )
    else:
        print("  OK - Password already matches!")

    # Step 4: Final verify
    print("\n[4/4] Final verification...")
    row2 = await conn.fetchrow(
        "SELECT password_hash, is_active FROM ppg_users WHERE username = 'admin'"
    )
    final_match = bcrypt.checkpw(password, row2['password_hash'].encode())
    print(f"  is_active: {row2['is_active']}")
    print(f"  password_hash length: {len(row2['password_hash'])}")
    print(f"  bcrypt.checkpw('admin123', hash): {final_match}")

    await conn.close()

    print("\n" + "=" * 60)
    if final_match and row2['is_active']:
        print("  ALL GOOD! Login should work: admin / admin123")
        print("  ")
        print("  Next steps:")
        print("  1. Run: .\\start.bat")
        print("  2. Wait 20 seconds")
        print("  3. Open: http://localhost:5173")
        print("  4. Login: admin / admin123")
    else:
        print("  SOMETHING WRONG - check errors above")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
