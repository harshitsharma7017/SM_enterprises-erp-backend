# RBAC Source Reconciliation

## Validation Report

During the implementation of the RBAC Phase 2 (seeding exact source data), a discrepancy between the initial investigation report and the actual Laravel source configuration was identified and resolved.

- **Original Claimed Count:** 120 permissions
- **Verified Source Count:** 108 permissions
- **Source of Truth:** `config/permissions.php` (Original Guru Traders Laravel Repository)

### Reason for Discrepancy
The previous investigation report erroneously stated there were 120 permissions. This occurred because it mathematically assumed that all 26 core modules possessed the full set of standard CRUD actions (26 × 4 = 104) and added 15 extended actions (expected total: ~119). However, it failed to account for modules that are strictly limited to non-standard, reduced action sets:
- `outstanding` lacks create, edit, delete (-3)
- `report` lacks create, edit, delete (-3)
- `permission` lacks create, edit, delete (-3)
- `company-profile` lacks create, delete (-2)

These 11 missing standard permissions bring the conceptual count down directly to the true source count of 108.

### Verified Final Counts
- **Total Unique Permissions:** 108
- **Standard CRUD Permissions:** 93
- **Extended Permissions:** 15
- **Role-Permission Mappings:** 322 (across 8 roles)

### Missing Permissions Addressed
When comparing the true list of 108 permissions against the text of the original investigation report, the following extended permission was found in the source but had been omitted from the initial report text:
- `outstanding.export`

This permission has been successfully extracted from `config/permissions.php` and included in the final seed data.
There is **no second missing permission**. All 108 permissions have been successfully accounted for, and no nonexistent generic CRUD permissions were forced into the configuration.
