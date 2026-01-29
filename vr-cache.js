// VR CrewWeb - LocalStorage Cache
(function() {
    'use strict';

    var VR = window.VR;

    // Cache keys
    var CACHE_KEYS = {
        ob: 'vr_cache_ob',
        sr: 'vr_cache_sr',
        franvaro: 'vr_cache_franvaro',
        fpfpv: 'vr_cache_fpfpv',
        role: 'vr_cache_role',
        srRate: 'vr_cache_srRate',
        timestamp: 'vr_cache_timestamp'
    };

    // Cache expiration (24 hours in milliseconds)
    var CACHE_EXPIRY = 24 * 60 * 60 * 1000;

    // ===== CHECK IF CACHE IS VALID =====
    VR.isCacheValid = function() {
        try {
            var timestamp = localStorage.getItem(CACHE_KEYS.timestamp);
            if (!timestamp) return false;

            var cacheTime = parseInt(timestamp, 10);
            var now = Date.now();

            // Check if cache is less than 24 hours old
            if (now - cacheTime > CACHE_EXPIRY) {
                console.log('VR: Cache expired, clearing...');
                VR.clearCache();
                return false;
            }

            // Also check if it's a new day (cache should refresh each day)
            var cacheDate = new Date(cacheTime);
            var today = new Date();
            if (cacheDate.getDate() !== today.getDate() ||
                cacheDate.getMonth() !== today.getMonth() ||
                cacheDate.getFullYear() !== today.getFullYear()) {
                console.log('VR: New day, clearing cache...');
                VR.clearCache();
                return false;
            }

            return true;
        } catch (e) {
            console.log('VR: localStorage not available');
            return false;
        }
    };

    // ===== LOAD CACHE =====
    VR.loadCache = function() {
        try {
            if (!VR.isCacheValid()) {
                console.log('VR: No valid cache found');
                return false;
            }

            var loaded = 0;

            // Load OB data
            var obData = localStorage.getItem(CACHE_KEYS.ob);
            if (obData) {
                VR.obData = JSON.parse(obData);
                loaded++;
                console.log('VR: Loaded', VR.obData.length, 'OB entries from cache');
            }

            // Load SR data
            var srData = localStorage.getItem(CACHE_KEYS.sr);
            if (srData) {
                VR.srData = JSON.parse(srData);
                loaded++;
                console.log('VR: Loaded', Object.keys(VR.srData).length, 'SR entries from cache');
            }

            // Load Frånvaro data
            var franvaroData = localStorage.getItem(CACHE_KEYS.franvaro);
            if (franvaroData) {
                VR.franvaroData = JSON.parse(franvaroData);
                loaded++;
                console.log('VR: Loaded', VR.franvaroData.length, 'Frånvaro entries from cache');
            }

            // Load FP/FPV data
            var fpfpvData = localStorage.getItem(CACHE_KEYS.fpfpv);
            if (fpfpvData) {
                VR.statistikFPData = JSON.parse(fpfpvData);
                loaded++;
                console.log('VR: Loaded', VR.statistikFPData.length, 'FP/FPV entries from cache');
            }

            // Load user role
            var role = localStorage.getItem(CACHE_KEYS.role);
            if (role) {
                VR.userRole = role;
                console.log('VR: Loaded role from cache:', role);
            }

            // Load SR rate
            var srRate = localStorage.getItem(CACHE_KEYS.srRate);
            if (srRate) {
                VR.detectedSRRate = parseInt(srRate, 10);
                console.log('VR: Loaded SR rate from cache:', VR.detectedSRRate);
            }

            console.log('VR: Loaded', loaded, 'data sets from cache');
            return loaded > 0;

        } catch (e) {
            console.log('VR: Error loading cache:', e);
            return false;
        }
    };

    // ===== SAVE CACHE =====
    VR.saveCache = function() {
        try {
            var saved = 0;

            // Save OB data
            if (VR.obData && VR.obData.length > 0) {
                localStorage.setItem(CACHE_KEYS.ob, JSON.stringify(VR.obData));
                saved++;
            }

            // Save SR data
            if (VR.srData && Object.keys(VR.srData).length > 0) {
                localStorage.setItem(CACHE_KEYS.sr, JSON.stringify(VR.srData));
                saved++;
            }

            // Save Frånvaro data
            if (VR.franvaroData && VR.franvaroData.length > 0) {
                localStorage.setItem(CACHE_KEYS.franvaro, JSON.stringify(VR.franvaroData));
                saved++;
            }

            // Save FP/FPV data
            if (VR.statistikFPData && VR.statistikFPData.length > 0) {
                localStorage.setItem(CACHE_KEYS.fpfpv, JSON.stringify(VR.statistikFPData));
                saved++;
            }

            // Save user role
            if (VR.userRole) {
                localStorage.setItem(CACHE_KEYS.role, VR.userRole);
            }

            // Save SR rate
            if (VR.detectedSRRate) {
                localStorage.setItem(CACHE_KEYS.srRate, VR.detectedSRRate.toString());
            }

            // Save timestamp
            localStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString());

            console.log('VR: Saved', saved, 'data sets to cache');
            return true;

        } catch (e) {
            console.log('VR: Error saving cache:', e);
            return false;
        }
    };

    // ===== CLEAR CACHE =====
    VR.clearCache = function() {
        try {
            for (var key in CACHE_KEYS) {
                if (CACHE_KEYS.hasOwnProperty(key)) {
                    localStorage.removeItem(CACHE_KEYS[key]);
                }
            }
            console.log('VR: Cache cleared');
            return true;
        } catch (e) {
            console.log('VR: Error clearing cache:', e);
            return false;
        }
    };

    // ===== GET CACHE STATUS =====
    VR.getCacheStatus = function() {
        var status = {
            valid: VR.isCacheValid(),
            ob: 0,
            sr: 0,
            franvaro: 0,
            fpfpv: 0,
            age: null
        };

        try {
            var timestamp = localStorage.getItem(CACHE_KEYS.timestamp);
            if (timestamp) {
                var cacheTime = parseInt(timestamp, 10);
                var ageMinutes = Math.round((Date.now() - cacheTime) / 60000);
                status.age = ageMinutes + ' min';
            }

            var obData = localStorage.getItem(CACHE_KEYS.ob);
            if (obData) status.ob = JSON.parse(obData).length;

            var srData = localStorage.getItem(CACHE_KEYS.sr);
            if (srData) status.sr = Object.keys(JSON.parse(srData)).length;

            var franvaroData = localStorage.getItem(CACHE_KEYS.franvaro);
            if (franvaroData) status.franvaro = JSON.parse(franvaroData).length;

            var fpfpvData = localStorage.getItem(CACHE_KEYS.fpfpv);
            if (fpfpvData) status.fpfpv = JSON.parse(fpfpvData).length;
        } catch (e) {
            // Ignore errors
        }

        return status;
    };

    console.log('VR: Cache loaded');
})();
