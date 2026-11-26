<script setup lang="ts">
import { useId } from 'vue'

/**
 * The Box at work, for the sign-in page: the product photo, a card laid on the Box's lid, and the
 * soft light the Box gives when it reads the card.
 *
 * Everything drawn over the photo belongs to its scene. The card is drawn in the photo's own
 * coordinates (1157 × 979), on the lid's measured perspective, in the colour of the photo's cards,
 * with their thickness and a contact shadow. The light is a teal tint multiplied onto the white
 * plastic and masked by the photo's own silhouette, so it only ever falls on the Box. The motion is
 * CSS transforms and opacity only; with reduced motion the scene rests with the card on the lid.
 */
const shadowFilter = `card-soft-${useId()}`
</script>

<template>
  <figure class="box-scene m-0">
    <div
      class="scene"
      role="img"
      aria-label="A Museotek Box with a telephone and a small computer on and beside it, and a set of cards. A visitor places a card on the Box and the Box lights up."
    >
      <picture>
        <source srcset="/login/museotekbox-kit.webp" type="image/webp" />
        <img src="/login/museotekbox-kit.png" alt="" width="1157" height="979" decoding="async" />
      </picture>
      <div class="light" aria-hidden="true" />
      <svg viewBox="0 0 1157 979" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <defs>
          <filter :id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <path
          class="card-shadow"
          :filter="`url(#${shadowFilter})`"
          d="M106.6 193.5Q95.1 195.1 111.8 198.4L316.4 238.9Q333.1 242.2 344.6 240.5L485.4 220.1Q496.9 218.4 480.2 215.1L275.6 174.7Q258.9 171.4 247.4 173.0Z"
        />
        <g class="card">
          <path class="card-edge" d="M92.1 190.1L330.1 237.2L493.9 213.4L493.9 220.4L330.1 244.2L92.1 197.1Z" />
          <path
            class="card-face"
            d="M103.6 188.5Q92.1 190.1 108.8 193.4L313.4 233.9Q330.1 237.2 341.6 235.5L482.4 215.1Q493.9 213.4 477.2 210.1L272.6 169.7Q255.9 166.4 244.4 168.0Z"
          />
        </g>
      </svg>
    </div>

    <!-- What the Box does, said under the picture rather than drawn on it. -->
    <figcaption class="status" aria-hidden="true">
      <span class="s1"><i />Waiting for a card</span>
      <span class="s2"><i /><span><strong>Card scanned.</strong> The Box plays the step linked to it.</span></span>
    </figcaption>
  </figure>
</template>

<style scoped>
.box-scene {
  --loop: 12s; /* one cycle of card, light and caption, shared so they stay in step */
}
.scene {
  position: relative;
  width: 100%;
  aspect-ratio: 1157 / 979;
}
.scene > picture,
.scene > picture > img,
.scene > svg,
.scene > .light {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.scene > picture > img {
  display: block;
}

/* The Box's light: strongest round the reader on the lid, fading down the front face. */
.light {
  -webkit-mask: url('/login/museotekbox-kit.webp') center / 100% 100% no-repeat;
  mask: url('/login/museotekbox-kit.webp') center / 100% 100% no-repeat;
  background:
    radial-gradient(30% 18% at 22% 21%, rgba(40, 190, 190, 0.42), rgba(40, 190, 190, 0) 72%),
    radial-gradient(34% 30% at 28% 30%, rgba(80, 200, 200, 0.14), rgba(80, 200, 200, 0) 75%);
  mix-blend-mode: multiply;
  opacity: 0;
  animation: light var(--loop) ease-in-out infinite;
}
@keyframes light {
  0%, 21% { opacity: 0; }
  27%, 62% { opacity: 1; }
  70%, 100% { opacity: 0; }
}

.card-face {
  fill: #e8e8e9;
  stroke: rgba(3, 7, 18, 0.1);
  stroke-width: 1;
}
.card-edge {
  fill: #c9cacd;
}
.card-shadow {
  fill: rgba(3, 7, 18, 0.22);
  opacity: 0;
  animation: card-shadow var(--loop) ease-in-out infinite;
}
@keyframes card-shadow {
  0%, 14% { opacity: 0; }
  22%, 64% { opacity: 1; }
  70%, 100% { opacity: 0; }
}

/* The card comes down from above, rests on the lid, and is lifted away again. Translations are in
   the photo's own units (the SVG's viewBox). */
.card {
  opacity: 0;
  animation:
    card-in var(--loop) linear infinite,
    card-move var(--loop) cubic-bezier(0.45, 0.05, 0.3, 1) infinite;
}
@keyframes card-in {
  0%, 3% { opacity: 0; }
  8%, 80% { opacity: 1; }
  85%, 100% { opacity: 0; }
}
@keyframes card-move {
  0%, 4% { transform: translate(10px, -330px); }
  15% { transform: translate(0, -48px); }
  21%, 64% { transform: translate(0, 0); }
  70% { transform: translate(0, -48px); }
  82%, 100% { transform: translate(10px, -330px); }
}

.status {
  display: grid;
  margin-top: 0.75rem;
  font-size: 0.8125rem;
  color: #5b6472;
}
.status > span {
  grid-area: 1 / 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.status i {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}
.status .s1 i { background: #c4c8cf; }
.status .s2 i { background: #12a6a7; }
.status strong {
  color: hsl(var(--foreground));
  font-weight: 600;
}
.status .s1 { animation: s1 var(--loop) ease-in-out infinite; }
.status .s2 { opacity: 0; animation: s2 var(--loop) ease-in-out infinite; }
@keyframes s1 {
  0%, 22% { opacity: 1; }
  26%, 66% { opacity: 0; }
  70%, 100% { opacity: 1; }
}
@keyframes s2 {
  0%, 23% { opacity: 0; }
  27%, 65% { opacity: 1; }
  69%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .light,
  .card,
  .card-shadow,
  .status .s1,
  .status .s2 {
    animation: none;
  }
  .light,
  .card,
  .card-shadow {
    opacity: 1;
  }
  .status .s1 { opacity: 0; }
  .status .s2 { opacity: 1; }
}
</style>
