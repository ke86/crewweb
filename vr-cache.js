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

            // Cache is valid indefinitely since we only store past dates
            // But clear if older than 7 days to avoid stale data buildup
            var SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
            if (now - cacheTime > SEVEN_DAYS) {
                console.log('VR: Cache older than 7 days, clearing...');
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

    // ===== HELPER: Check if date is in the past =====
    VR.isDateInPast = function(dateStr) {
        // Parse dd-mm-yyyy format
        var parts = dateStr.split('-');
        if (parts.length !== 3) return false;

        var day = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1; // 0-indexed
        var year = parseInt(parts[2], 10);

        var entryDate = new Date(year, month, day);
        var today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        return entryDate < today; // Only past dates, not today
    };

    // ===== FILTER PAST DATES ONLY =====
    VR.filterPastDates = function(data, dateField) {
        if (!data) return [];

        if (Array.isArray(data)) {
            return data.filter(function(entry) {
                var dateStr = entry[dateField || 'date'];
                return dateStr && VR.isDateInPast(dateStr);
            });
        } else {
            // Object (like srData)
            var filtered = {};
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    var entry = data[key];
                    var dateStr = entry[dateField || 'date'] || key;
                    if (VR.isDateInPast(dateStr)) {
                        filtered[key] = entry;
                    }
                }
            }
            return filtered;
        }
    };

    // ===== SAVE CACHE =====
    VR.saveCache = function() {
        try {
            var saved = 0;

            // Save OB data (only past dates)
            if (VR.obData && VR.obData.length > 0) {
                var pastOB = VR.filterPastDates(VR.obData, 'date');
                if (pastOB.length > 0) {
                    localStorage.setItem(CACHE_KEYS.ob, JSON.stringify(pastOB));
                    saved++;
                    console.log('VR: Cached', pastOB.length, 'OB entries (past only)');
                }
            }

            // Save SR data (only past dates)
            if (VR.srData && Object.keys(VR.srData).length > 0) {
                var pastSR = VR.filterPastDates(VR.srData, 'date');
                var pastSRCount = Object.keys(pastSR).length;
                if (pastSRCount > 0) {
                    localStorage.setItem(CACHE_KEYS.sr, JSON.stringify(pastSR));
                    saved++;
                    console.log('VR: Cached', pastSRCount, 'SR entries (past only)');
                }
            }

            // Save Frånvaro data (only past dates)
            if (VR.franvaroData && VR.franvaroData.length > 0) {
                var pastFranvaro = VR.filterPastDates(VR.franvaroData, 'date');
                if (pastFranvaro.length > 0) {
                    localStorage.setItem(CACHE_KEYS.franvaro, JSON.stringify(pastFranvaro));
                    saved++;
                    console.log('VR: Cached', pastFranvaro.length, 'Frånvaro entries (past only)');
                }
            }

            // Save FP/FPV data (only past dates)
            if (VR.statistikFPData && VR.statistikFPData.length > 0) {
                var pastFP = VR.filterPastDates(VR.statistikFPData, 'date');
                if (pastFP.length > 0) {
                    localStorage.setItem(CACHE_KEYS.fpfpv, JSON.stringify(pastFP));
                    saved++;
                    console.log('VR: Cached', pastFP.length, 'FP/FPV entries (past only)');
                }
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

    // ===== PRELOAD CACHE KEY =====
    VR.PRELOAD_CACHE_KEY = 'vr_preload_timestamp';

    // ===== GET PRELOAD TIMESTAMP =====
    VR.getPreloadTimestamp = function() {
        try {
            var ts = localStorage.getItem(VR.PRELOAD_CACHE_KEY);
            return ts ? parseInt(ts, 10) : null;
        } catch (e) {
            return null;
        }
    };

    // ===== FORMAT PRELOAD DATE =====
    VR.formatPreloadDate = function() {
        var ts = VR.getPreloadTimestamp();
        if (!ts) return null;

        var d = new Date(ts);
        var day = d.getDate();
        var mon = VR.MONTHS_SHORT[d.getMonth()];
        var hours = ('0' + d.getHours()).slice(-2);
        var mins = ('0' + d.getMinutes()).slice(-2);

        return day + ' ' + mon + ' kl ' + hours + ':' + mins;
    };

    // ===== PRELOAD ALL DATA =====
    // Loads all historical data (before today) and caches it
    VR.doPreloadAll = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.closeMenu();

        // Save current view to restore after preload
        VR.preloadReturnView = VR.currentViewAction || 'doSchema';

        VR.showLoader('Förladdar data');
        VR.updateLoader(5, 'Startar...');

        VR.preloadStep = 0;
        VR.preloadTotal = 5; // Anställd, Schema, OB, Komp, Lön

        // Step 1: Anställddata
        VR.preloadAnstalld();
    };

    VR.preloadAnstalld = function() {
        VR.updateLoader(10, 'Laddar Anställddata...');

        // Navigate to Anställddata
        VR.clickFolder();

        setTimeout(function() {
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Anställddata');
                if (el) {
                    VR.stopTimer();
                    el.click();
                    VR.waitForPreloadAnstalld();
                } else if (n > 15) {
                    VR.stopTimer();
                    // Skip to next step
                    VR.preloadSchema();
                }
            }, 400);
        }, 500);
    };

    VR.waitForPreloadAnstalld = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            var empData = document.getElementById('EmployeeData');

            if (empData || n > 10) {
                VR.stopTimer();
                VR.updateLoader(20, 'Sparar Anställddata...');

                // Parse and cache anställddata
                if (empData) {
                    VR.parseAndCacheAnstalld();
                }

                setTimeout(VR.preloadSchema, 500);
            }
        }, 400);
    };

    VR.parseAndCacheAnstalld = function() {
        var kvalifikationer = [];
        var tables = document.querySelectorAll('table');

        for (var t = 0; t < tables.length; t++) {
            var table = tables[t];
            var headerRow = table.querySelector('tr');
            if (!headerRow) continue;

            var headers = headerRow.querySelectorAll('th, td');
            var hasNamn = false;
            var hasGiltigFran = false;

            for (var h = 0; h < headers.length; h++) {
                var headerText = headers[h].textContent.trim().toLowerCase();
                if (headerText === 'namn') hasNamn = true;
                if (headerText.indexOf('giltig från') > -1) hasGiltigFran = true;
            }

            if (hasNamn && hasGiltigFran) {
                var rows = table.querySelectorAll('tr');
                for (var r = 1; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td');
                    if (cells.length >= 2) {
                        var namn = cells[0] ? cells[0].textContent.trim() : '';
                        var giltigFran = cells[1] ? cells[1].textContent.trim() : '';
                        var giltigTill = cells[2] ? cells[2].textContent.trim() : '';

                        if (!namn || namn.toLowerCase() === 'namn') continue;
                        if (namn.toLowerCase() === 'lokförare') continue;
                        if (namn.length === 1 && /^[A-Z]$/.test(namn)) continue;

                        kvalifikationer.push({
                            namn: namn,
                            giltigFran: giltigFran,
                            giltigTill: giltigTill
                        });
                    }
                }
            }
        }

        if (kvalifikationer.length > 0 && VR.saveAnstalldCache) {
            VR.saveAnstalldCache(kvalifikationer);
            console.log('VR: Preload cached', kvalifikationer.length, 'kvalifikationer');
        }
    };

    VR.preloadSchema = function() {
        VR.updateLoader(30, 'Laddar Schema...');

        VR.clickFolder();

        setTimeout(function() {
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Schema');
                if (el) {
                    VR.stopTimer();
                    el.click();
                    VR.waitForPreloadSchema();
                } else if (n > 15) {
                    VR.stopTimer();
                    VR.preloadOB();
                }
            }, 400);
        }, 500);
    };

    VR.waitForPreloadSchema = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;

            // Look for schema table
            var tables = document.querySelectorAll('table');
            var hasData = false;
            for (var i = 0; i < tables.length; i++) {
                if (tables[i].querySelectorAll('tr').length > 5) {
                    hasData = true;
                    break;
                }
            }

            if (hasData || n > 15) {
                VR.stopTimer();
                VR.updateLoader(35, 'Schema (aktuell månad)...');

                // Schema data is already cached by prefetch module
                if (VR.prefetchAllData) {
                    VR.prefetchAllData();
                }

                // Now navigate to previous month
                setTimeout(VR.preloadSchemaPrevMonth, 800);
            }
        }, 400);
    };

    VR.preloadSchemaPrevMonth = function() {
        VR.updateLoader(42, 'Laddar föregående månad...');

        // Find and click the left arrow (previous month button)
        var prevBtn = null;

        // Try to find the prev month button in CrewWeb's schema page
        var allElements = document.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent.trim();
            // Look for left arrow or "previous" type buttons
            if (text === '◀' || text === '◄' || text === '<' || text === '‹') {
                var rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    prevBtn = el;
                    break;
                }
            }
        }

        // Also try common selectors
        if (!prevBtn) {
            prevBtn = document.querySelector('[class*="prev"]') ||
                      document.querySelector('[class*="Prev"]') ||
                      document.querySelector('[aria-label*="previous"]') ||
                      document.querySelector('[title*="Föregående"]');
        }

        if (prevBtn) {
            console.log('VR: Clicking prev month button');
            prevBtn.click();
            VR.waitForPreloadSchemaPrev();
        } else {
            console.log('VR: Prev month button not found, skipping');
            // Continue to OB anyway
            setTimeout(VR.preloadOB, 500);
        }
    };

    VR.waitForPreloadSchemaPrev = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;

            // Wait for the page to update with previous month data
            var tables = document.querySelectorAll('table');
            var hasData = false;
            for (var i = 0; i < tables.length; i++) {
                if (tables[i].querySelectorAll('tr').length > 5) {
                    hasData = true;
                    break;
                }
            }

            if (hasData || n > 12) {
                VR.stopTimer();
                VR.updateLoader(50, 'Föregående månad laddat...');

                // Prefetch this month's data too
                if (VR.prefetchAllData) {
                    VR.prefetchAllData();
                }

                setTimeout(VR.preloadOB, 800);
            }
        }, 400);
    };

    VR.preloadOB = function() {
        VR.updateLoader(55, 'Laddar OB...');

        VR.clickFolder();

        setTimeout(function() {
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Ersättningsspecifikation');
                if (el) {
                    VR.stopTimer();
                    el.click();
                    VR.waitForPreloadOB();
                } else if (n > 15) {
                    VR.stopTimer();
                    VR.preloadKomp();
                }
            }, 400);
        }, 500);
    };

    VR.waitForPreloadOB = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;

            var tables = document.querySelectorAll('table');
            var hasData = false;
            for (var i = 0; i < tables.length; i++) {
                if (tables[i].querySelectorAll('tr').length > 3) {
                    hasData = true;
                    break;
                }
            }

            if (hasData || n > 20) {
                VR.stopTimer();
                VR.updateLoader(70, 'OB laddat...');

                // Parse OB data
                if (VR.parseOBData) {
                    VR.parseOBData();
                }

                setTimeout(VR.preloadKomp, 500);
            }
        }, 400);
    };

    VR.preloadKomp = function() {
        VR.updateLoader(80, 'Laddar Komp...');

        VR.clickFolder();

        setTimeout(function() {
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Tidbank');
                if (el) {
                    VR.stopTimer();
                    el.click();
                    VR.waitForPreloadKomp();
                } else if (n > 15) {
                    VR.stopTimer();
                    VR.preloadFinish();
                }
            }, 400);
        }, 500);
    };

    VR.waitForPreloadKomp = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;

            // Look for komp data
            var pageText = document.body.textContent || '';
            var hasKomp = pageText.indexOf('Saldo') > -1 || pageText.indexOf('timmar') > -1;

            if (hasKomp || n > 15) {
                VR.stopTimer();
                VR.updateLoader(82, 'Komp laddat...');

                // Parse komp saldo
                if (VR.parseKompSaldo) {
                    VR.parseKompSaldo();
                }

                setTimeout(VR.preloadLon, 500);
            }
        }, 400);
    };

    // ===== PRELOAD LÖN (föregående månad) =====
    VR.preloadLon = function() {
        VR.updateLoader(88, 'Beräknar föregående lön...');

        // Check if already cached
        if (VR.getPayoutMonthInfo && VR.getLonFromCache) {
            var payoutInfo = VR.getPayoutMonthInfo(-1);
            var cached = VR.getLonFromCache(payoutInfo.workYear, payoutInfo.workMonth);
            if (cached) {
                console.log('VR: Lön already cached for prev month');
                setTimeout(VR.preloadFinish, 300);
                return;
            }
        }

        // Calculate previous month's lön silently (without rendering)
        if (VR.calculateLonForPreload) {
            VR.calculateLonForPreload(-1);
        }

        setTimeout(VR.preloadFinish, 500);
    };

    VR.preloadFinish = function() {
        VR.updateLoader(95, 'Sparar cache...');

        // Save all data to cache
        VR.saveCache();

        // Save preload timestamp
        try {
            localStorage.setItem(VR.PRELOAD_CACHE_KEY, Date.now().toString());
        } catch (e) {
            console.log('VR: Error saving preload timestamp');
        }

        VR.updateLoader(100, 'Klar!');

        setTimeout(function() {
            VR.hideLoader();

            // Show success message
            VR.showPreloadSuccess();
        }, 500);
    };

    VR.showPreloadSuccess = function() {
        var popup = document.createElement('div');
        popup.id = 'vrPreloadSuccess';
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);color:#fff;padding:32px 48px;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:99999;text-align:center';
        popup.innerHTML = '\
<div style="font-size:60px;margin-bottom:16px">✅</div>\
<div style="font-size:24px;font-weight:700;margin-bottom:8px">Data förladdad!</div>\
<div style="font-size:18px;color:rgba(255,255,255,0.7)">All historisk data är nu cachad</div>\
<div style="margin-top:20px;font-size:14px;color:rgba(255,255,255,0.5)">Tryck för att stänga</div>';

        popup.onclick = function() {
            popup.remove();
        };

        document.body.appendChild(popup);

        setTimeout(function() {
            if (popup.parentNode) popup.remove();
        }, 3000);

        // Restore previous view after popup closes
        setTimeout(function() {
            if (VR.preloadReturnView && typeof VR[VR.preloadReturnView] === 'function') {
                console.log('VR: Restoring view after preload:', VR.preloadReturnView);
                VR[VR.preloadReturnView]();
            } else {
                // Default: show Schema
                if (typeof VR.doSchema === 'function') {
                    VR.doSchema();
                }
            }
            VR.preloadReturnView = null;
        }, 500);
    };

    console.log('VR: Cache loaded');
})();
