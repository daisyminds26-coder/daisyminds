# Daisy Minds LMS

## Project Overview

Daisy Minds LMS is a modern, enterprise-grade Learning Management System (LMS) designed for educational institutions, coaching centers, corporate training providers, and certification organizations.

The objective is to build a production-ready, scalable, secure, and maintainable LMS that delivers an exceptional experience for students, trainers, administrators, and management.

The system must follow enterprise software engineering practices from the first commit.

---

# Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Axios
- React Router

## Backend

- Node.js
- Express.js
- TypeScript
- MongoDB Atlas
- Mongoose
- Redis
- BullMQ
- JWT Authentication
- Passport
- Cloudinary SDK
- Swagger

## Infrastructure

- Hostinger VPS
- Ubuntu
- Nginx
- PM2
- MongoDB Atlas
- Cloudinary
- GitHub
- Cloudflare

---

# Development Philosophy

Always think as:

- Senior Product Manager
- Senior Project Manager
- Senior Software Architect
- Senior Full Stack Engineer
- Senior Backend Engineer
- Senior Frontend Engineer
- Senior UI/UX Designer
- Senior DevOps Engineer
- Senior Database Architect
- Senior Security Engineer
- Senior QA Engineer

Each role has more than 10 years of enterprise software experience.

Never generate code like a tutorial.

Generate production-ready code.

---

# Architecture Principles

Always follow

- Modular Architecture
- Feature-based Architecture
- Clean Architecture
- SOLID Principles
- DRY
- KISS
- Separation of Concerns

Never duplicate business logic.

---

# UI/UX Standards

The application should feel like a premium SaaS product.

Style:

- Clean
- Professional
- Modern
- Spacious
- Responsive

Primary Color

Daisy Yellow

Background

Warm White

Typography

Dark Charcoal

Avoid

- Bootstrap look
- Material UI look
- Generic dashboards
- Glassmorphism
- Heavy gradients
- Cluttered interfaces

Always design for:

Desktop

Tablet

Mobile

Accessibility

WCAG compliant

---

# Backend Standards

Use Express.js best practices, following a layered architecture (see ARCHITECTURE.md).

Controllers

Thin

Business Logic

Services

Validation

Zod schemas

Database

Repository Pattern where needed

Always validate requests.

Never trust frontend input.

---

# Database Standards

MongoDB Atlas

Proper indexes

Pagination

Soft delete only when needed

Audit fields

createdBy

updatedBy

createdAt

updatedAt

Never create unnecessary collections.

---

# API Standards

REST API

/api/v1

Swagger

Consistent response format

Pagination

Filtering

Sorting

Validation

Rate limiting

---

# Security Standards

Always implement

JWT

Refresh Tokens

Role Based Access

Permission Checks

Password Hashing

Helmet

Input Validation

NoSQL Injection Protection

XSS Protection

Secure Upload

Cloudinary Signed Upload

Secure Video Access

Audit Logging

Never expose secrets.

---

# Performance Standards

Use

Lazy Loading

Redis Cache

Cloudinary CDN

Pagination

Background Jobs

Optimized Queries

Code Splitting

Measure before optimizing.

---

# Testing Standards

Every module must include

Unit Tests

Integration Tests

Validation Tests

Permission Tests

API Tests

Edge Cases

Manual Checklist

No module is complete until tests pass.

---

# Documentation

Always update documentation after major implementation.

Never leave undocumented architecture changes.

---

# Coding Rules

Never use

any

Never disable TypeScript

Never disable ESLint

Never hardcode secrets

Never hardcode IDs

Never create placeholder APIs

Never ignore errors

Never create fake implementations

Always explain important architectural decisions.

---

# Implementation Workflow

For every feature

1. Read PRD
2. Inspect existing code
3. Prepare implementation plan
4. Identify risks
5. Implement only approved scope
6. Run lint
7. Run tests
8. Run build
9. Fix issues
10. Update documentation

---

# Definition of Done

A feature is complete only when

✓ Lint passes

✓ Build passes

✓ Tests pass

✓ Responsive

✓ Accessible

✓ Secure

✓ Documented

✓ Production Ready

---

Always prioritize

Quality

Security

Scalability

Maintainability

Performance

Developer Experience

User Experience

over development speed.
