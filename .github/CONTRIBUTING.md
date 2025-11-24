# Contributing

This is a guide for contributing to all of my projects.

## Social Human Emotional Stuff

- Before embarking on a large scale change, especially any change
  that significantly changes architecture or requires user code
  changes (SemVer major/breaking changes), I'd encourage you to
  discuss it with me, either in an issue or via email or chat, so
  that you don't waste time and effort on something that ends up
  being pointless.
- If I don't accept your change, feel free to fork and develop
  your own project. There is so much room for everyone to do
  whatever they want! If your idea isn't a fit for my project,
  maybe that just means it should be your project instead :)
- There is no room for ego in code. If there are two patches that
  do similar things, and I land the other and not yours, that's
  not a slight against you. If anything, yours probably helped me
  see that the thing needed to be done, so it was not a waste.
- I speak plainly and generally find excessive social padding
  gets in the way of discussions about code, especially for
  non-native English speakers. Do not take code review
  personally. If I'm harsh in my criticism, it's because I
  respect you as a developer.
- Any demands, pleading, or otherwise implying that I or any
  other open source maintainer _owes_ you something, by virtue of
  having given away our time and labor, will be shut down
  immediately. Your dependence is not my emergency. If you need
  something done quickly, be prepared to pay market rates for it.

## More Practical Stuff

- Except in _very_ rare cases, every patch must have a test, and
  the test must fail without the patch.
- Test coverage must remain at 100%, if it is there already.
- I do not accept pull requests that change `package.json` or
  `package-lock.json`. If you think that a dependency needs to be
  updated, then post an issue about it, _not_ a pull request. It
  is no more effort to just install it myself, and the security
  impacts of accepting dependency changes via pull request are
  simply too risky.
- All discussions on issues and PRs _must_ be in English. It
  doesn't have to be _good_ English; I have a lot of experience
  using automated translations like Google Translate to discuss
  things across language barriers. Please do not be embarrassed
  about your language. Every culture is entitled to a place. This
  language is simply the one I use, and if posts are not in
  English, then it's more challenging for me to maintain the
  project.

## AI

While you are of course free to use whichever tools you find
helpful,  **I am not interested in code contributions that were
written by AI systems**, unless _you personally_ can demonstrate
deep understanding of what is going on.

Large low-effort PRs authored by LLMs (or otherwise automatically
machine-generated) will be dismissed, rudely if necessary.

## Legal Stuff

By contributing to my project, you assert that you are legally
entitled to make that code part of the projet, and that it is not
(to the best of your knowledge) encumbered by any legal
instrument or other reason why you would not be allowed to share
it, and that you understand that the code you have contributed
will be distributed under the same or similar license in the
future, at my discretion.

If you do not or cannot agree to this, then please do not
contribute. Instead, feel free to fork this project and make your
changes in your own copy, insofar as the license allows.
