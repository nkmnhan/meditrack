// Prevent FOUC: apply dark class before first paint
(function(){var t=localStorage.getItem('meditrack-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})();
