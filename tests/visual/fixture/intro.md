# Compliance report fixture

This is a placeholder report fixture for the QuantEcon report theme. It exercises the
rendering surfaces the Phase 0 scaffold has — prose, headings, lists, tables and maths —
so the build, the FOUC guard and the preview all have a real page to serve.

(a-section)=
## A section

Some prose with *emphasis*, `inline code`, and an inline equation $e^{i\pi} + 1 = 0$.
Here is a [link](https://quantecon.org) and a footnote reference.[^note]

[^note]: The footnote body.

- First bullet
- Second bullet with a [cross-reference](#a-section)
- Third bullet

1. Ordered one
2. Ordered two

| Series | Lectures | Mean score |
| ------ | -------- | ---------- |
| alpha  | 12       | 7.4        |
| beta   | 8        | 5.1        |

> A blockquote, to check quote styling.

:::{note}
An admonition, to check the tone surfaces the report cards will build on.
:::
