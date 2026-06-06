Behaviour Driven Development
========================================================================================================================

Overview of BDD
------------------------------------------------------------------------------------------------------------------------

A supplemental package to support JavaScript development using Behavior Driven Development, where failing tests for
specific behaviors are written first, and then code is developed to pass the tests.

This is a simple, pragmatic approach to test-first development using a flexible, code-first test harness which is plain
old JavaScript.

BDD follows the philosophy that the behavior of a body of code (e.g. a module's public interface), is defined by a
test-suite which describes it's specification. This package is designed to allow such a suite to be defined in a
declarative manner. BDD is a semantic variation on TDD, but emphasizes full-coverage testing of the public
specification, instead of targeting the private parts of the code.

Done properly, the test suite describes the specification, and the tests prove the specification is met. A programmer
can then clearly read the behaviorial intent embodied in the test suite, and that intent is emitted whenever the body
of code is changed and compiled (well, for JS, syntax checked).

This is a relatively stable package, but is still organically growing as tests are added for various projects under
control of the author; it will become stable once the amount of code under test reaches a point where it's clear that
the range of needs has been fully met. Until then the specification may change at any time.
