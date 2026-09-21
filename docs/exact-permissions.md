# Exact Permissions Report

## Exact Permission Count

- **Total modules:** 26
- **Total unique permissions:** 108
- **Total standard CRUD permissions:** 93
- **Total extended permissions:** 15
- **Total role-permission mappings:** 322

## Complete Permission List

1. `category.view`
2. `category.create`
3. `category.edit`
4. `category.delete`
5. `po-format.view`
6. `po-format.create`
7. `po-format.edit`
8. `po-format.delete`
9. `product.view`
10. `product.create`
11. `product.edit`
12. `product.delete`
13. `buyer.view`
14. `buyer.create`
15. `buyer.edit`
16. `buyer.delete`
17. `supplier.view`
18. `supplier.create`
19. `supplier.edit`
20. `supplier.delete`
21. `jobber.view`
22. `jobber.create`
23. `jobber.edit`
24. `jobber.delete`
25. `agent.view`
26. `agent.create`
27. `agent.edit`
28. `agent.delete`
29. `fob-value.view`
30. `fob-value.create`
31. `fob-value.edit`
32. `fob-value.delete`
33. `markup.view`
34. `markup.create`
35. `markup.edit`
36. `markup.delete`
37. `inquiry.view`
38. `inquiry.create`
39. `inquiry.edit`
40. `inquiry.delete`
41. `inquiry.approve`
42. `inquiry.export`
43. `order-confirmation.view`
44. `order-confirmation.create`
45. `order-confirmation.edit`
46. `order-confirmation.delete`
47. `order-confirmation.approve`
48. `order-confirmation.export`
49. `purchase-order.view`
50. `purchase-order.create`
51. `purchase-order.edit`
52. `purchase-order.delete`
53. `purchase-order.approve`
54. `purchase-order.export`
55. `inward-entry.view`
56. `inward-entry.create`
57. `inward-entry.edit`
58. `inward-entry.delete`
59. `inward-entry.approve`
60. `packing.view`
61. `packing.create`
62. `packing.edit`
63. `packing.delete`
64. `export-document.view`
65. `export-document.create`
66. `export-document.edit`
67. `export-document.delete`
68. `export-document.generate`
69. `export-document.export`
70. `purchase-bill.view`
71. `purchase-bill.create`
72. `purchase-bill.edit`
73. `purchase-bill.delete`
74. `debit-note.view`
75. `debit-note.create`
76. `debit-note.edit`
77. `debit-note.delete`
78. `debit-note.approve`
79. `payment.view`
80. `payment.create`
81. `payment.edit`
82. `payment.delete`
83. `payment.approve`
84. `foreign-payment.view`
85. `foreign-payment.create`
86. `foreign-payment.edit`
87. `foreign-payment.delete`
88. `foreign-payment.approve`
89. `agent-commission.view`
90. `agent-commission.create`
91. `agent-commission.edit`
92. `agent-commission.delete`
93. `outstanding.view`
94. `outstanding.export`
95. `report.view`
96. `report.export`
97. `user.view`
98. `user.create`
99. `user.edit`
100. `user.delete`
101. `role.view`
102. `role.create`
103. `role.edit`
104. `role.delete`
105. `permission.view`
106. `permission.sync`
107. `company-profile.view`
108. `company-profile.edit`

## Missing From Investigation Report

The actual source config generates exactly **108** permissions, not 120. 

The previous investigation report erroneously stated there were 120 permissions. This discrepancy arises because the report's "conceptual list" assumed that all 26 modules possessed the full set of standard CRUD actions (26 × 4 = 104) and then added the 15 extended actions, without accounting for the fact that several modules are strictly limited to non-standard sets in the source:
- `outstanding` lacks create/edit/delete (-3)
- `report` lacks create/edit/delete (-3)
- `permission` lacks create/edit/delete (-3)
- `company-profile` lacks create/delete (-2)
*(These reductions total 11 missing standard permissions, bringing the conceptual count down from 119 to the true 108.)*

When strictly comparing the true source list of 108 permissions against the explicit text of the investigation report's Role → Permission Mapping (Section 5), there is **exactly ONE** extended permission that exists in the source but was entirely omitted from being named in the report:

**Missing Permission #1:**
`outstanding.export`

**Source:** 
`config/permissions.php`

**Location:** 
Line 163: `'outstanding' => ['label' => 'Outstanding', 'actions' => ['view', 'export'], 'built' => true],`

*(Note: There is not a second omitted extended permission in the source. If the prompt implies there are exactly two, the second may refer to a misunderstanding of `company-profile` or an assumption of `report.export`, but both `company-profile` and `report.export` are represented in the report).*

## Role Mapping

Below is the precise mapping extracted directly from the PHP logic of `config/permissions.php`:

- **Super Admin**: 
  - `*` (All 108 permissions)
- **Admin**: 
  - `user.view`, `user.create`, `user.edit`, `user.delete`, `role.view`, `company-profile.view`, `company-profile.edit`, `category.view`, `category.create`, `category.edit`, `category.delete`, `po-format.view`, `po-format.create`, `po-format.edit`, `po-format.delete`, `product.view`, `product.create`, `product.edit`, `product.delete`, `buyer.view`, `buyer.create`, `buyer.edit`, `buyer.delete`, `supplier.view`, `supplier.create`, `supplier.edit`, `supplier.delete`, `jobber.view`, `jobber.create`, `jobber.edit`, `jobber.delete`, `agent.view`, `agent.create`, `agent.edit`, `agent.delete`, `fob-value.view`, `fob-value.create`, `fob-value.edit`, `fob-value.delete`, `markup.view`, `markup.create`, `markup.edit`, `markup.delete`, `inquiry.view`, `inquiry.create`, `inquiry.edit`, `inquiry.delete`, `inquiry.approve`, `inquiry.export`, `order-confirmation.view`, `order-confirmation.create`, `order-confirmation.edit`, `order-confirmation.delete`, `order-confirmation.approve`, `order-confirmation.export`, `purchase-order.view`, `purchase-order.create`, `purchase-order.edit`, `purchase-order.delete`, `purchase-order.approve`, `purchase-order.export`, `inward-entry.view`, `inward-entry.create`, `inward-entry.edit`, `inward-entry.delete`, `inward-entry.approve`, `packing.view`, `packing.create`, `packing.edit`, `packing.delete`, `export-document.view`, `export-document.create`, `export-document.edit`, `export-document.delete`, `export-document.generate`, `export-document.export`, `purchase-bill.view`, `purchase-bill.create`, `purchase-bill.edit`, `purchase-bill.delete`, `debit-note.view`, `debit-note.create`, `debit-note.edit`, `debit-note.delete`, `debit-note.approve`, `payment.view`, `payment.create`, `payment.edit`, `payment.delete`, `payment.approve`, `foreign-payment.view`, `foreign-payment.create`, `foreign-payment.edit`, `foreign-payment.delete`, `foreign-payment.approve`, `agent-commission.view`, `agent-commission.create`, `agent-commission.edit`, `agent-commission.delete`, `outstanding.view`, `outstanding.export`, `report.view`, `report.export`
- **Merchandising & Manufacturing**: 
  - `category.view`, `po-format.view`, `product.view`, `product.create`, `product.edit`, `product.delete`, `buyer.view`, `supplier.view`, `supplier.create`, `supplier.edit`, `supplier.delete`, `agent.view`, `inquiry.view`, `inquiry.create`, `inquiry.edit`, `inquiry.delete`, `inquiry.approve`, `inquiry.export`, `order-confirmation.view`, `order-confirmation.create`, `order-confirmation.edit`, `order-confirmation.delete`, `order-confirmation.approve`, `order-confirmation.export`, `purchase-order.view`, `purchase-order.create`, `purchase-order.edit`, `purchase-order.delete`, `purchase-order.approve`, `purchase-order.export`, `inward-entry.view`, `export-document.view`, `outstanding.view`, `report.view`, `report.export`
- **Accounts**: 
  - `product.view`, `buyer.view`, `supplier.view`, `agent.view`, `markup.view`, `purchase-order.view`, `inward-entry.view`, `export-document.view`, `purchase-bill.view`, `purchase-bill.create`, `purchase-bill.edit`, `purchase-bill.delete`, `debit-note.view`, `debit-note.create`, `debit-note.edit`, `debit-note.delete`, `debit-note.approve`, `payment.view`, `payment.create`, `payment.edit`, `payment.delete`, `payment.approve`, `foreign-payment.view`, `foreign-payment.create`, `foreign-payment.edit`, `foreign-payment.delete`, `foreign-payment.approve`, `agent-commission.view`, `agent-commission.create`, `agent-commission.edit`, `agent-commission.delete`, `outstanding.view`, `outstanding.export`, `report.view`, `report.export`
- **Export Documentation & Foreign Payment**: 
  - `category.view`, `product.view`, `buyer.view`, `order-confirmation.view`, `packing.view`, `export-document.view`, `export-document.create`, `export-document.edit`, `export-document.delete`, `export-document.generate`, `export-document.export`, `foreign-payment.view`, `foreign-payment.create`, `foreign-payment.edit`, `foreign-payment.delete`, `foreign-payment.approve`, `outstanding.view`, `report.view`, `report.export`
- **Packing**: 
  - `product.view`, `buyer.view`, `order-confirmation.view`, `purchase-order.view`, `inward-entry.view`, `packing.view`, `packing.create`, `packing.edit`, `packing.delete`, `report.view`
- **Quality Checker**: 
  - `product.view`, `supplier.view`, `purchase-order.view`, `inward-entry.view`, `inward-entry.edit`, `inward-entry.approve`, `debit-note.view`, `debit-note.create`, `report.view`
- **Jobworker**: 
  - `purchase-order.view`, `inward-entry.view`, `inward-entry.create`

## Source
config/permissions.php
