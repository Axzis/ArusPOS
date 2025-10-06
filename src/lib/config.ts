
// A centralized list of super admin emails
const SUPER_ADMIN_EMAILS = [
    'superadmin@gmail.com',
    'axzis11@gmail.com',
    'arus.superadmin@gmail.com',
];

/**
 * Checks if a given email belongs to a super admin.
 * @param email The email to check.
 * @returns True if the email is in the super admin list, false otherwise.
 */
export function isSuperAdminUser(email: string): boolean {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email);
}
