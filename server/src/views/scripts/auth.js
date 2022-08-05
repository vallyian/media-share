/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */

window.gSignInCb = (response) => window.location = `/?credential=${response.credential}&redirect=${encodeURIComponent(window.location.pathname)}`;
