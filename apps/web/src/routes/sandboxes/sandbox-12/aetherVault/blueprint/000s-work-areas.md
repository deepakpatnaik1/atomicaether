# 000s Series: Development Work Areas

## Overview
The three-tier development architecture that ensures quality progression from experimentation to production.

---

## 001: Sandboxes
**Purpose**: R&D laboratory for unrestricted experimentation

**Location**: `/sandboxes/`

**Constraints**: 
- ❌ No Essential Boss Rules apply
- ✅ Hardcoding encouraged
- ✅ Rapid iteration prioritized
- ✅ Single file constraint: All tinkering restricted to sandbox +page.svelte file only
- ✅ Visual version control: Multiple sandboxes preserve working versions side-by-side

**Flow**: Ideas → Experiments → Proven Techniques

**Workflow Pattern**: Like GitHub but visual - duplicate successful sandbox to create new working copy, preserving previous versions for comparison and rollback

**Output**: Validated concepts ready for brick development

---

## 002: Bricks  
**Purpose**: Implement and test individual bricks with demos

**Locations**: 
- Bricks: `/src/lib/` (actual brick implementation)
- Brick Demos: `/brickdemos/` (testing interface)

**Constraints**:
- ✅ Essential Boss Rules enforced
- ✅ Demo-driven development (Rule 10)
- ✅ Individual brick isolation
- ✅ Boss testing interface

**Process**: 
1. Implement individual bricks (following Essential Boss Rules)
2. Create demos to test each brick
3. Validate brick functionality

**Flow**: Sandbox Concepts → Brick Implementation → Brick Demos → Validated Components

**Output**: Production-ready bricks with proven demos

---

## 003: Main App
**Purpose**: Production integration and final architecture

**Location**: `/src/routes/`, `/src/lib/`

**Constraints**:
- ✅ All Essential Boss Rules enforced
- ✅ Full architectural compliance
- ✅ Easy removal (Rule 5)
- ✅ Four buses integration (Rule 2)

**Flow**: Validated Components → Integrated Features → Production System

**Output**: Robust, decoupled production application

---

## Development Process

```
SANDBOXES            BRICKS               MAIN APP
    ↓                      ↓                  ↓
Experiment    →     Prove & Test    →    Integrate
Multiple Canvas     Individual Demos     Production Code
No Rules           All Rules Apply      Full Compliance
High Risk          Medium Risk          Low Risk
High Speed         Medium Speed         High Quality
```

## Quality Gates

- **Sandboxes → Bricks**: Must solve core problem elegantly
- **Bricks → Main App**: Must pass Boss testing and Rule 10 compliance  
- **Main App**: Must follow all Essential Boss Rules

## Benefits

- **Risk Isolation**: Failures contained to appropriate tier
- **Progressive Refinement**: Ideas mature through proven stages
- **Quality Assurance**: Boss validates before production integration
- **Clean Architecture**: Production code follows all rules
- **Development Velocity**: Right tool for right phase

---

This three-tier system ensures **nothing broken reaches production** while maintaining **maximum experimentation freedom** in early stages.