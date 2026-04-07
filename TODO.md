# Ghost Data Bug Fix - Device Unlock JIT Wipe

## Steps:
- [x] Step 1: Edit DeviceController.js unlockDevice method
  - Add `accessRequestReason: null` to Prisma update data ✓
  - Fetch full updatedDevice with `include: { user: true }` ✓
  - Add `this.appServer.getIO().emit('device_updated', updatedDevice);` broadcast ✓
- [x] Step 2: Update this TODO.md with completion status
- [ ] Step 3: Test manual LOCK → UNLOCK flow (DB fields NULL, frontend updates to permanent SAFE, no JIT countdown)

**After completion:** Restart backend (`cd system/admin/backend && npm start`), test via frontend DeviceTable unlock button on a JIT device.
