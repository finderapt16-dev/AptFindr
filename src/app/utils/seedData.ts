// Utility to seed initial data - this would be called once to set up test data

export function seedInitialData() {
  // Create test accounts
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const passwords = JSON.parse(localStorage.getItem("passwords") || "{}");

  // Check if test admin exists
  const testAdmin = users.find((u: any) => u.email === "admin@test.com");
  if (!testAdmin) {
    const newAdmin = {
      id: "admin-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "admin",
      isVerified: true,
    };
    users.push(newAdmin);
    passwords["admin@test.com"] = "admin123";

    console.log("Test admin created:");
    console.log("Email: admin@test.com");
    console.log("Password: admin123");
  }

  // Check if test landlord exists
  const testLandlord = users.find((u: any) => u.email === "landlord@test.com");
  if (!testLandlord) {
    const newLandlord = {
      id: "landlord-1",
      email: "landlord@test.com",
      name: "Test Landlord",
      role: "landlord",
      mobileNumber: "+63 917 123 4567",
      permitNumber: "BPN-2024-001234",
      isVerified: false, // Start as unverified so admin can verify
    };
    users.push(newLandlord);
    passwords["landlord@test.com"] = "password123";

    console.log("Test landlord created (unverified):");
    console.log("Email: landlord@test.com");
    console.log("Password: password123");
  }

  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("passwords", JSON.stringify(passwords));
}
