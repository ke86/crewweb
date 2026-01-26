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
        tomorrowDateStr: ''
    };

    // Modules to load in order
    var modules = [
        'vr-core.js',
        'vr-ui.js',
        'vr-lone.js',
        'vr-anstalld.js',
        'vr-schema.js',
        'vr-komp.js',
        'vr-daydetail.js'
    ];

    var loaded = 0;

    function loadNext() {
        if (loaded >= modules.length) {
            // All modules loaded - initialize
            if (typeof VR.init === 'function') {
                VR.init();
            }
            return;
        }

        var script = document.createElement('script');
        script.src = BASE + modules[loaded] + '?' + VERSION;
        script.onload = function() {
            loaded++;
            loadNext();
        };
        script.onerror = function() {
            console.error('VR: Failed to load ' + modules[loaded]);
        };
        document.body.appendChild(script);
    }

    // Start loading
    loadNext();
})();
