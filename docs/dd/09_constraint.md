# Lovefield Design Documents
## Constraint Enforcement

Primary key and not null constraints are mainly enforced by `ConstraintChecker`
class with corresponding methods.

AA index, or B+ tree index initialized with `unique` property set to true,
assumes the index is unique (i.e. unique or primary key). When the insertion
causes a key violation, it will throw an exception and thus will enforce either
the primary key constraint or unique key constraint.

The foreign key constraint is not implemented yet. We plan to revisit
constraint enforcement when we implement it.
