# Contributing Guidelines

## Code of Conduct

This is a pretty small project and it hasn't been a problem yet. However, to
be clear: Everyone needs to be nice to each other. Sexist/racist/etc behavior
won't be tolerated.

Glad we cleared that up.

## Branching

Before working on your fix/feature/whatever, you should create a new branch to
work on. Do something like:

```sh
$ git checkout -b 'my-sweet-new-pull-request'
```

## Please Please Please Start With A Test

ecstatic has some pretty gnarly branching/logic underneath. Tests are extremely
important because they (a) prove that your feature/fix works, and (b) avoid
regressions in the future. Even if your patch is problematic enough to not be
merged, a test will still be very helpful for confirming any future fix.

I won't reject your patch outright if it's missing new tests, but it sure
helps!

## Code Style

Ecstatic's code base follows a relatively consistent style. The closer your
patch blends in with the status quo, the better.

A few PROTIPS off the top of my head:

1. Variables don't need to all be declared at the top, BUT variable *blocks*
should do the whole one-var, tons-of-commas thing.
2. Look at how spacing is done around conditionals and functions. Do it like
that. 
3. `else`'s and similar should be on the line *after* the preceding bracket.

We can refine this as the need arises.

## Pull Request

Make a pull request against master with your new branch. Explain briefly what
the patch does to the code, along with any concerns.

(If you don't have a description, it's hard for me to put the changes in
context. That makes it more difficult for me to merge!)

## Keep It Moving

I don't always notice new PRs, and sometimes I will forget to follow up on
them. If this happens to you, you can bump the PR thread or find me on
IRC or twitter.

## LAST RULE

HAVE FUN :v :v

