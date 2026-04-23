import bcrypt

password = b"admin123"
stored_hash = b"$2b$12$8C92m.jhLDdHzDkO39TK0e/LH9/SAlgZA0lYHbssRsvg5/BDHtiGe"

result = bcrypt.checkpw(password, stored_hash)
print("Password match:", result)

if not result:
    print("Hash goc KHONG match voi admin123!")
    print("Tao hash moi cho admin123...")
    new_hash = bcrypt.hashpw(password, bcrypt.gensalt()).decode()
    print("NEW HASH:", new_hash)
    print("Verify new hash:", bcrypt.checkpw(password, new_hash.encode()))