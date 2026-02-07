// VR CrewWeb Schema Tool - Loader
// https://ke86.github.io/crewweb/
(function() {
    'use strict';

    var BASE = 'https://ke86.github.io/crewweb/';
    var VERSION = Date.now(); // Cache-busting

    // Global namespace
    window.VR = window.VR || {
        // Element IDs
        ID: {
            header: 'vrHeader',
            view: 'vrView',
            loader: 'vrLoader',
            detail: 'vrDetail'
        },
        // State
        timer: null,
        pct: 0,
        schemaYear: null,
        schemaMonth: null,
        dayData: {},
        todayDateStr: '',
        tomorrowDateStr: '',
        // User role and SR rate
        userRole: null,
        SR_RATE: 75
    };

    // ===== INSTANT SPLASH SCREEN =====
    var totalSteps;
    var splash = document.createElement('div');
    splash.id = 'vrSplash';
    splash.innerHTML = '\
<style>\
@keyframes vrSplashPulse{0%,100%{opacity:0.4}50%{opacity:1}}\
@keyframes vrSplashSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}\
@keyframes vrSplashFadeIn{0%{opacity:0;transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}\
#vrSplash{position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0a1a;z-index:99999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;animation:vrSplashFadeIn 0.2s ease-out}\
#vrSplash .vr-sp-ring{width:64px;height:64px;border:4px solid rgba(255,255,255,0.1);border-top:4px solid #e94560;border-radius:50%;animation:vrSplashSpin 0.8s linear infinite;margin-bottom:28px}\
#vrSplash .vr-sp-title{font-size:32px;font-weight:700;color:#fff;margin-bottom:6px;letter-spacing:1px}\
#vrSplash .vr-sp-sub{font-size:15px;color:rgba(255,255,255,0.35);margin-bottom:32px}\
#vrSplash .vr-sp-status{font-size:16px;color:rgba(255,255,255,0.5);animation:vrSplashPulse 1.5s infinite}\
#vrSplash .vr-sp-bar-wrap{width:180px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:14px;overflow:hidden}\
#vrSplash .vr-sp-bar{height:100%;width:0%;background:linear-gradient(90deg,#e94560,#f39c12);border-radius:2px;transition:width 0.3s ease}\
</style>\
<div class="vr-sp-ring"></div>\
<div class="vr-sp-title">CrewWeb</div>\
<div class="vr-sp-sub">VR Tools</div>\
<div class="vr-sp-status" id="vrSplashStatus">Startar...</div>\
<div class="vr-sp-bar-wrap"><div class="vr-sp-bar" id="vrSplashBar"></div></div>';
    document.body.appendChild(splash);

    function updateSplash(text, loaded) {
        var statusEl = document.getElementById('vrSplashStatus');
        var barEl = document.getElementById('vrSplashBar');
        if (statusEl) statusEl.textContent = text;
        if (barEl) barEl.style.width = Math.round((loaded / totalSteps) * 100) + '%';
    }

    // Modules to load in order
    var modules = [
        'vr-core.js',
        'vr-cache.js',      // Cache module - load early
        'vr-ui.js',
        'vr-lone.js',
        'vr-ob.js',
        'vr-overtid.js',    // Övertid module
        'vr-franvaro.js',
        'vr-fpfpv.js',
        'vr-srtillagg.js',
        'vr-anstalld.js',
        'vr-schema.js',
        'vr-komp.js',
        'vr-daydetail.js',
        'vr-forvantad.js',
        'vr-statistik.js',
        'vr-lonberakning.js',
        'vr-firebase.js',   // Firebase integration
        'vr-export.js',     // Export to Firebase/CSV
        'vr-whosworking.js' // Who's working today
    ];

    // External libraries to load (before modules)
    var externalLibs = [
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
    ];

    totalSteps = externalLibs.length + modules.length;
    var extLoaded = 0;
    var modLoaded = 0;

    function loadExternalLibs() {
        if (extLoaded >= externalLibs.length) {
            // All external libs loaded, start loading modules
            loadNextModule();
            return;
        }

        updateSplash('Laddar bibliotek... (' + (extLoaded + 1) + '/' + totalSteps + ')', extLoaded);

        var script = document.createElement('script');
        script.src = externalLibs[extLoaded];
        script.onload = function() {
            extLoaded++;
            loadExternalLibs();
        };
        script.onerror = function() {
            console.warn('VR: Failed to load external lib (continuing anyway)');
            extLoaded++;
            loadExternalLibs();
        };
        document.body.appendChild(script);
    }

    function loadNextModule() {
        if (modLoaded >= modules.length) {
            updateSplash('Startar...', totalSteps);
            // All modules loaded - initialize
            if (typeof VR.init === 'function') {
                VR.init();
            }
            return;
        }

        var stepNum = externalLibs.length + modLoaded + 1;
        updateSplash('Laddar moduler... (' + stepNum + '/' + totalSteps + ')', externalLibs.length + modLoaded);

        var script = document.createElement('script');
        script.src = BASE + modules[modLoaded] + '?' + VERSION;
        script.onload = function() {
            modLoaded++;
            loadNextModule();
        };
        script.onerror = function() {
            console.error('VR: Failed to load ' + modules[modLoaded]);
            modLoaded++;
            loadNextModule();
        };
        document.body.appendChild(script);
    }

    // Start loading external libs first, then modules
    loadExternalLibs();
})();
