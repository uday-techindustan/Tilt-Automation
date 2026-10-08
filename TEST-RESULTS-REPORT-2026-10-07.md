# TiLT Protein PDP Regression Test Report

**Full run date:** 7 October 2026  
**Browsers:** Chromium and WebKit only  
**Products:** Chocolate Sea Salt and Vanilla Almond  
**Workers:** 1 (serial run)  
**Duration:** 34 minutes 28 seconds  
**Scope:** 416 test executions

## Executive summary

| Result | Count | Share |
|---|---:|---:|
| Passed | 288 | 69.2% |
| Failed | 46 | 11.1% |
| Skipped | 82 | 19.7% |
| **Total** | **416** | **100%** |

The serial run is the authoritative full-suite baseline. It was substantially
cleaner than the earlier parallel run, indicating that parallel execution had
interfered with some live-store tests. No flaky executions were recorded in the
full run.

### Results by browser and product

The 20 mobile test executions are grouped under “Mobile device tests”; all
remaining executions are product-specific.

| Browser | Product/scope | Passed | Failed | Skipped | Total |
|---|---|---:|---:|---:|---:|
| Chromium | Chocolate Sea Salt | 66 | 14 | 19 | 99 |
| Chromium | Vanilla Almond | 55 | 25 | 19 | 99 |
| Chromium | Mobile device tests | 8 | 0 | 2 | 10 |
| WebKit | Chocolate Sea Salt | 75 | 4 | 20 | 99 |
| WebKit | Vanilla Almond | 76 | 3 | 20 | 99 |
| WebKit | Mobile device tests | 8 | 0 | 2 | 10 |
| **Total** |  | **288** | **46** | **82** | **416** |

## Failure analysis

### Storefront behavior and content

- **TC089 — Meta title:** The live titles do not contain the tested flavor
  names. For example, Chocolate Sea Salt returns “Chocolate Protein Bar With
  Probiotics | 28g Protein – TiLT PROTEIN”.
- **TC096 — Product type:** The product data has an empty Shopify `type`; the
  `protein-bars` tag exists, but the PDP does not display the expected “Protein
  Bars” label.
- **TC098 — Breadcrumb schema:** Visible breadcrumbs exist, but the page does
  not publish a `BreadcrumbList` JSON-LD object.
- **TC061 — Review filtering/sorting:** The sort selection is accepted, but the
  visible review order does not match the expected order in Chromium.
- **TC053 — Shipping accordion:** One WebKit execution did not reveal the
  Shipping panel in the full run. A later focused serial rerun passed all four
  product/browser combinations after explicitly checking the active tab and
  panel states.
- **TC032 — Mobile gallery swipe:** One Chromium execution failed in the full
  run, but a focused rerun passed. This remains an intermittent failure.
- **TC083, TC091–TC094, TC065, TC074–TC075, TC078:** The full run recorded
  Chromium-only failures across performance, URL/network handling, cart,
  checkout, upsell, and popup scenarios. These need individual review against
  the saved Playwright errors; do not presume a single common root cause.
- **TC014, TC016–TC022, TC025–TC028:** These failures occurred for Chromium /
  Vanilla Almond across cart, checkout, or analytics flows. Live Shopify
  request throttling (“Too many attempts: Please try again in a few minutes”)
  was observed during the run and can prevent cart/checkout interactions from
  reaching the expected state. Those results must remain failures until
  verified against a storefront that is no longer rate-limited.

No failed assertion was changed to pass by weakening its expected behavior.
Failures that reflect current storefront content or behavior remain visible.

## Follow-up fixes and validation

After the full run:

- TC053 now waits for the Shipping tab and panel to enter their active states
  before verifying visibility.
- TC079 and TC080 now skip unless run in their respective Edge and Firefox
  projects. Chromium/WebKit executions no longer count as Edge/Firefox
  coverage.
- `npm run typecheck` passed.
- A focused Chromium/WebKit run of TC053, TC079, and TC080 completed with 4
  passes and 8 intentional skips. All four TC053 product/browser executions
  passed. Edge and Firefox were not run.

These focused validations do not replace the 416-execution full-run baseline;
the full suite has not been rerun after these changes.

## Skipped tests

Skipped executions include browser-specific mobile tests when run in the
non-matching project, tests marked `fixme`, and conditional cases for features
or content unavailable in the current storefront (for example, videos, size
options, sold-out products, or optional checkout controls). TC079/TC080 also
now intentionally skip in Chromium/WebKit because those projects are not Edge
or Firefox.

## Artifacts

The full-run JSON, including detailed per-test errors and attachments, is
available at:

`/Users/uday.pathania/.copilot/session-state/898d964e-2019-4b8c-8062-95bc0aeffc3c/files/pdp-debug-rerun-2026-10-07.json`

The earlier parallel-run report is retained separately and should not be used
as the current baseline:

`/Users/uday.pathania/.copilot/session-state/898d964e-2019-4b8c-8062-95bc0aeffc3c/files/pdp-full-run.json`
