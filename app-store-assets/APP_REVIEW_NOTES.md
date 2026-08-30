# App Review Notes — build 2

Paste the block under "Reviewer text" into **App Store Connect → your version → App Review
Information → Notes**. Everything above it is context for us, not for Apple.

---

## Why build 1 was rejected

**Guideline 3.1.1 (In-App Purchase)** and **3.1.3(c) (Enterprise Services)**. The app unlocked
content that could only be bought on our website, and because the same service was also offered
to organizations, individual sales had to run through In-App Purchase.

Both halves are addressed in build 2:

| Half of the rejection | Fix |
|---|---|
| Individual sales bypassed IAP | 3-month auto-renewable subscription at $19.99, sold in-app via StoreKit |
| Same service sold to organizations | Corporate/organizational tier removed entirely — no organizational price is advertised anywhere |

The second half is the part a reviewer cannot infer by using the app, since it is defined by what
is **absent**. It has to be stated in the notes or it goes unnoticed.

## The reviewer-visibility trap

`appreview@theexecutivemeditator.com` has permanent access (granted before the subscription model,
preserved by migration 005). `AppNavigator` sends anyone **with** access straight past the paywall.

So a reviewer using only that account **never sees the in-app purchase at all** — a direct route to
"we were unable to locate the in-app purchase in your app."

Do not fix this by expiring the account: the reviewer then cannot evaluate the actual product,
which is what caused the earlier Guideline 2.1 information request.

Fix it by supplying **two accounts**, and saying plainly what each is for. Telling the reviewer to
"sign out and register" is **not** a safe substitute — `supabase.auth.signUp` returns no session
while email confirmation is enabled, so a self-registering reviewer can dead-end at a confirmation
email they cannot receive.

### Creating the second account (do this before submitting)

1. Sign up at <https://www.theexecutivemeditator.com/setup> with an address you control —
   a Gmail plus-address such as `sergio4156+iapreview@gmail.com` works.
2. Click the confirmation link in the inbox. **Confirming is required**; an unconfirmed account
   cannot sign in at all.
3. **Abandon the Stripe checkout.** Do not pay. The account must stay unpaid — that is the whole
   point of it.
4. Verify in Supabase → `profiles` that the row has `access_expires_at = NULL`.
5. Sign in with it on a device once, and confirm you land on the subscription screen.

## Before submitting — also confirm

- **Paid Applications Agreement** is active with banking and tax completed, or the subscription
  cannot reach "Ready to Submit".
- The subscription is **attached to the version being submitted**. An unattached subscription is
  invisible to review.
- Both the **Production and Sandbox** App Store Server Notification URLs are set.
- The subscription has a **review screenshot** and localization.

---

## Reviewer text

> **What changed in this build**
>
> This build adds In-App Purchase, addressing Guideline 3.1.1 from the previous review. It also
> removes the organizational/corporate tier entirely, addressing Guideline 3.1.3(c) — the app and
> our website no longer offer or advertise any organizational pricing, and no such tier can be
> purchased by any route.
>
> **Subscription offered**
>
> One auto-renewable subscription: "Executive Meditator Access", 3 months, $19.99. There is no
> other in-app purchase and no other price.
>
> **Two test accounts are provided, for two different purposes.**
>
> 1. **To review the app itself — `appreview@theexecutivemeditator.com`**
>    This account already has access, so it opens directly into the program. Use it to evaluate the
>    app's functionality: the 21-day program, the reminder schedule, and settings.
>
> 2. **To review the in-app purchase — `sergio4156+iapreview@gmail.com`**
>    This account has no access, so it opens directly onto the subscription screen. Use it to
>    evaluate the purchase flow. Signing in with this account is the fastest route to the in-app
>    purchase; account 1 will not display it, because it is already subscribed.
>
> Passwords for both accounts are in the password fields above.
>
> **Testing the purchase**
>
> Sign in with account 2. The subscription screen appears immediately on launch, showing the price,
> the 3-month term, the renewal terms, Restore Purchases, and links to our Terms of Use and Privacy
> Policy. Tap Subscribe to complete the purchase with a sandbox Apple Account. Access is granted as
> soon as the purchase is verified with the App Store Server API.
>
> "Restore Purchases" on the same screen restores an existing subscription for the signed-in Apple
> Account.
>
> **About the app**
>
> The app is a micro-meditation reminder service. It is deliberately passive: it sends timed push
> notifications across a 21-day program, and the practice is to pause for ten seconds when one
> arrives. Most of the value is delivered through notifications rather than through on-screen
> interaction, which is intentional to the product rather than a limitation of the build.
>
> Push notifications are required to experience the core function. If notification permission was
> declined on first launch, it can be re-enabled in iOS Settings.
>
> **Purchases outside the app**
>
> Subscriptions are also available on our website for users who arrive there first. The app does
> not link to, reference, or direct users toward that purchase path in any way — all in-app
> purchasing is through In-App Purchase.
>
> Thank you for the review. We are happy to supply anything further.
