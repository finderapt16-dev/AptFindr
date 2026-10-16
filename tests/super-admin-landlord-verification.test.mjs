import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("super admin landlord verification renders a landlord with a pending apartment", async (t) => {
  const vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  t.after(() => vite.close());

  const { AdminLandlordVerification } = await vite.ssrLoadModule(
    "/src/superadmin/SuperAdminLandlordVerification.jsx",
  );
  const markup = renderToStaticMarkup(
    createElement(AdminLandlordVerification, {
      apartments: [
        {
          id: "apartment-1",
          landlord_id: "landlord-1",
          approval_status: "pending",
        },
      ],
      landlords: [
        {
          id: "landlord-1",
          name: "Test Landlord",
          email: "landlord@example.com",
          is_verified: true,
        },
      ],
      onViewVerification: () => {},
    }),
  );

  assert.match(markup, /Test Landlord/);
  assert.match(markup, /Pending/);
});
