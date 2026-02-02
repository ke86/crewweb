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
        'vr-prefetch.js',
        'vr-firebase.js',   // Firebase integration
        'vr-whosworking.js' // Who's working today
    ];

    // External libraries to load (before modules)
    var externalLibs = [
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
    ];

    var extLoaded = 0;
    var modLoaded = 0;

    function loadExternalLibs() {
        if (extLoaded >= externalLibs.length) {
            // All external libs loaded, start loading modules
            loadNextModule();
            return;
        }

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
            // All modules loaded - initialize
            if (typeof VR.init === 'function') {
                VR.init();
            }
            return;
        }

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
