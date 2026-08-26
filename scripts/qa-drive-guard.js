const PRODUCTION_HOSTNAME = "amazon-fba-manager-virid.vercel.app";

function isNonProductionDriveTarget(base, env = process.env) {
  try {
    const hostname = new URL(base).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const allowedHosts = new Set((env.QA_DRIVE_ALLOWED_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean));
    return hostname !== PRODUCTION_HOSTNAME
      && (hostname === "localhost"
        || hostname === "127.0.0.1"
        || hostname === "::1"
        || allowedHosts.has(hostname));
  } catch {
    return false;
  }
}

function canRunDriveCrud(base, env) {
  return env.QA_DRIVE_CRUD_ALLOW === "I_UNDERSTAND_NON_PRODUCTION"
    && isNonProductionDriveTarget(base, env);
}

module.exports = { canRunDriveCrud, isNonProductionDriveTarget };
