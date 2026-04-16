// Logout countdown timer — reads redirect URL from data attribute
(function () {
  var countdownEl = document.getElementById("logout-countdown");
  if (!countdownEl) return;

  var redirectTarget = countdownEl.getAttribute("data-redirect");
  var remaining = 5;

  var timer = setInterval(function () {
    remaining -= 1;
    countdownEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(timer);
      if (redirectTarget) {
        window.location.href = redirectTarget;
      }
    }
  }, 1000);
})();
