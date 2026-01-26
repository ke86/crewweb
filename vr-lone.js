// VR CrewWeb - Löneredovisningar (OB + Frånvaro)
(function() {
    'use strict';

    var VR = window.VR;

    // ===== SHARED: Find Hämta button =====
    VR.findHamtaButton = function() {
        var inputs = document.querySelectorAll('input[type="submit"], input[type="button"], button');
        for (var i = 0; i < inputs.length; i++) {
            var val = (inputs[i].value || inputs[i].textContent || '').toLowerCase();
            if (val.indexOf('hämta') > -1) {
                return inputs[i];
            }
        }
        return null;
    };

    // ===== SHARED: Set date INPUT field =====
    VR.setDateInput = function(input, targetDate) {
        console.log('VR setDateInput: Setting to "' + targetDate + '"');
        input.value = targetDate;
        // Trigger change event
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent('change', true, true);
        input.dispatchEvent(evt);
        // Also trigger input event for good measure
        var inputEvt = document.createEvent('HTMLEvents');
        inputEvt.initEvent('input', true, true);
        input.dispatchEvent(inputEvt);
    };

    // ===== SHARED: Find date INPUT fields =====
    VR.findDateInputs = function() {
        var inputs = document.querySelectorAll('input');
        var dateInputs = [];

        for (var i = 0; i < inputs.length; i++) {
            var val = inputs[i].value || '';
            // Match date format DD-MM-YYYY
            if (val.match(/^\d{1,2}-\d{2}-\d{4}$/)) {
                dateInputs.push(inputs[i]);
                console.log('VR: Found date input with value: ' + val);
            }
        }

        console.log('VR: Found ' + dateInputs.length + ' date inputs total');
        return dateInputs;
    };

    // ===== SHARED: Check if on Löneredovisningar page =====
    VR.isOnLonePage = function() {
        // Check for Lönedagar/Löneperiod radio buttons - unique to this page
        var radios = document.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < radios.length; i++) {
            var parent = radios[i].parentElement;
            if (parent && parent.textContent.toLowerCase().indexOf('lönedagar') > -1) {
                return true;
            }
        }
        return false;
    };

    // ===== SHARED: Navigate to Löneredovisningar =====
    // Path: Mapp-ikon → Löneredovisningar
    VR.navigateToLoneredovisningar = function(callback) {
        // Check if already on Löneredovisningar page (look for Lönedagar radio, not just Hämta)
        if (VR.isOnLonePage()) {
            console.log('VR: Already on Löneredovisningar page');
            VR.updateLoader(30, 'Sidan redan laddad...');
            callback();
            return;
        }

        // ALWAYS open folder menu first, then find Löneredovisningar
        VR.updateLoader(10, 'Öppnar mapp-meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Löneredovisningar...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var lone = VR.findMenuItem('Löneredovisningar');
                if (lone) {
                    VR.stopTimer();
                    VR.updateLoader(20, 'Klickar på Löneredovisningar...');
                    lone.click();
                    VR.waitForLonePage(callback);
                } else if (n > 25) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout - hittade ej Löneredovisningar');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    VR.waitForLonePage = function(callback) {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            // Check for Lönedagar radio button - specific to this page
            if (VR.isOnLonePage()) {
                VR.stopTimer();
                VR.updateLoader(45, 'Sidan laddad!');
                setTimeout(callback, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== SHARED: Setup page and fetch =====
    VR.setupLonePageAndFetch = function(parseCallback) {
        VR.updateLoader(50, 'Väljer Lönedagar...');

        // Step 1: Find and click Lönedagar radio button
        var radios = document.querySelectorAll('input[type="radio"]');
        var lonedagarRadio = null;
        for (var i = 0; i < radios.length; i++) {
            var label = radios[i].parentElement ? radios[i].parentElement.textContent : '';
            var name = radios[i].name || '';
            var id = radios[i].id || '';
            if (label.toLowerCase().indexOf('lönedagar') > -1 ||
                name.toLowerCase().indexOf('lönedagar') > -1 ||
                id.toLowerCase().indexOf('lönedagar') > -1) {
                lonedagarRadio = radios[i];
                break;
            }
        }

        if (!lonedagarRadio) {
            var labels = document.querySelectorAll('label');
            for (var j = 0; j < labels.length; j++) {
                if (labels[j].textContent.toLowerCase().indexOf('lönedagar') > -1) {
                    var forId = labels[j].getAttribute('for');
                    if (forId) {
                        lonedagarRadio = document.getElementById(forId);
                    } else {
                        lonedagarRadio = labels[j].querySelector('input[type="radio"]');
                    }
                    if (lonedagarRadio) break;
                }
            }
        }

        if (lonedagarRadio) {
            console.log('VR: Found Lönedagar radio, clicking...');
            lonedagarRadio.click();
        } else {
            console.log('VR: Lönedagar radio NOT found');
        }

        // Step 2: Wait for page to update, then set dates
        setTimeout(function() {
            VR.updateLoader(55, 'Ställer in datum...');

            // Find all INPUT elements that contain dates
            var dateInputs = VR.findDateInputs();

            // Set start date (14-12-2025)
            if (dateInputs.length >= 1) {
                console.log('VR: Setting start date to 14-12-2025');
                VR.setDateInput(dateInputs[0], '14-12-2025');
            } else {
                console.log('VR: No date input found for start date!');
            }

            // Wait a bit then set end date
            setTimeout(function() {
                // Set end date (31-12-2026)
                if (dateInputs.length >= 2) {
                    console.log('VR: Setting end date to 31-12-2026');
                    VR.setDateInput(dateInputs[1], '31-12-2026');
                } else {
                    console.log('VR: No date input found for end date!');
                }

                // Step 3: Click Hämta button
                setTimeout(function() {
                    VR.updateLoader(65, 'Klickar Hämta...');

                    var hamtaBtn = VR.findHamtaButton();
                    if (hamtaBtn) {
                        console.log('VR: Clicking Hämta button');
                        hamtaBtn.click();
                        VR.updateLoader(70, 'Hämtar data...');
                        VR.waitForLoneData(parseCallback);
                    } else {
                        console.log('VR: Hämta button NOT found');
                        VR.updateLoader(0, 'Hämta-knapp ej hittad');
                        setTimeout(VR.hideLoader, 2000);
                    }
                }, 400);
            }, 300);
        }, 500);
    };

    VR.waitForLoneData = function(parseCallback) {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(70 + Math.min(n, 20), 'Väntar på data...');

            var tables = document.querySelectorAll('table');
            var dateHeaders = document.body.innerHTML.match(/\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/gi);

            if ((tables.length > 2 && dateHeaders && dateHeaders.length > 0) || n > 40) {
                VR.stopTimer();
                VR.updateLoader(92, 'Läser data...');
                setTimeout(parseCallback, 500);
            } else if (n > 60) {
                VR.stopTimer();
                VR.updateLoader(0, 'Timeout - ingen data');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== OB FUNCTIONALITY =====
    VR.doOB = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar OB-tillägg');
        VR.updateLoader(5, 'Letar efter sidan...');

        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseAndShowOB);
        });
    };

    VR.parseAndShowOB = function() {
        VR.updateLoader(95, 'Analyserar OB-data...');

        var obData = [];

        var OB_RATES = {
            'L.Hb': { name: 'Kvalificerad OB', rate: 54.69 },
            'L.Storhelgstillägg': { name: 'Storhelgs OB', rate: 122.88 }
        };

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE' && el.tagName !== 'TR' && el.tagName !== 'TD') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i)) {
                    currentDate = dateMatch[1];
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';
                    var col2 = cells[1] ? cells[1].textContent.trim() : '';

                    if (col1.toLowerCase() === 'löneslag') continue;

                    if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                        var timeMatch = col2.match(/(\d+):(\d+)/);
                        var hours = 0;
                        var minutes = 0;
                        if (timeMatch) {
                            hours = parseInt(timeMatch[1], 10);
                            minutes = parseInt(timeMatch[2], 10);
                        }
                        var totalHours = hours + (minutes / 60);
                        var rate = OB_RATES[col1] ? OB_RATES[col1].rate : 0;
                        var kronor = totalHours * rate;

                        obData.push({
                            date: currentDate,
                            type: col1,
                            typeName: OB_RATES[col1] ? OB_RATES[col1].name : col1,
                            time: col2,
                            hours: totalHours,
                            rate: rate,
                            kronor: kronor
                        });
                    }
                }
            }
        }

        VR.updateLoader(98, 'Bygger vy...');

        var viewHtml = VR.buildOBView(obData);

        var totalKr = 0;
        for (var k = 0; k < obData.length; k++) {
            totalKr += obData[k].kronor;
        }

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('OB-tillägg', obData.length + ' poster | ' + totalKr.toFixed(2) + ' kr', viewHtml);
        }, 300);
    };

    VR.buildOBView = function(obData) {
        if (obData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen OB-data hittades</div>\
                    <div style="font-size:22px;color:#888">Endast L.Hb och L.Storhelgstillägg visas</div>\
                </div>';
        }

        var totals = {
            'L.Hb': { hours: 0, kronor: 0, count: 0, rate: 54.69, name: 'Kvalificerad OB' },
            'L.Storhelgstillägg': { hours: 0, kronor: 0, count: 0, rate: 122.88, name: 'Storhelgs OB' }
        };

        var grandTotalKr = 0;
        var grandTotalHours = 0;

        for (var i = 0; i < obData.length; i++) {
            var item = obData[i];
            if (totals[item.type]) {
                totals[item.type].hours += item.hours;
                totals[item.type].kronor += item.kronor;
                totals[item.type].count++;
            }
            grandTotalKr += item.kronor;
            grandTotalHours += item.hours;
        }

        var html = '<div style="background:linear-gradient(135deg,#AF52DE,#5856D6);border-radius:30px;padding:40px;margin-bottom:24px;text-align:center;box-shadow:0 10px 40px rgba(175,82,222,0.3)">';
        html += '<div style="font-size:50px;margin-bottom:12px">🌙</div>';
        html += '<div style="font-size:24px;font-weight:600;color:rgba(255,255,255,0.9)">OB-tillägg</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#fff;margin:12px 0">' + grandTotalKr.toFixed(2) + ' kr</div>';
        html += '<div style="font-size:16px;color:rgba(255,255,255,0.8)">' + grandTotalHours.toFixed(1) + ' timmar totalt</div>';
        html += '</div>';

        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px">';

        if (totals['L.Hb'].count > 0) {
            html += '<div style="background:#fff;border-radius:20px;padding:24px;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
            html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">';
            html += '<span style="font-size:28px">🚂</span>';
            html += '<span style="font-size:16px;font-weight:600;color:#333">Kvalificerad OB</span>';
            html += '</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-bottom:12px">L.Hb · 54,69 kr/h</div>';
            html += '<div style="font-size:32px;font-weight:700;color:#AF52DE">' + totals['L.Hb'].kronor.toFixed(2) + ' kr</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-top:4px">' + totals['L.Hb'].hours.toFixed(1) + ' h · ' + totals['L.Hb'].count + ' dagar</div>';
            html += '</div>';
        }

        if (totals['L.Storhelgstillägg'].count > 0) {
            html += '<div style="background:#fff;border-radius:20px;padding:24px;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
            html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">';
            html += '<span style="font-size:28px">🎄</span>';
            html += '<span style="font-size:16px;font-weight:600;color:#333">Storhelgs OB</span>';
            html += '</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-bottom:12px">L.Storhelgstillägg · 122,88 kr/h</div>';
            html += '<div style="font-size:32px;font-weight:700;color:#FF9500">' + totals['L.Storhelgstillägg'].kronor.toFixed(2) + ' kr</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-top:4px">' + totals['L.Storhelgstillägg'].hours.toFixed(1) + ' h · ' + totals['L.Storhelgstillägg'].count + ' dagar</div>';
            html += '</div>';
        }

        html += '</div>';

        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">OB-typ</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Antal</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        for (var d = 0; d < obData.length; d++) {
            var row = obData[d];
            var bgCol = d % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:15px;color:#333">' + row.typeName + '</div>';
            html += '<div style="font-size:15px;color:#333;text-align:right">' + row.time + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:#AF52DE;text-align:right">' + row.kronor.toFixed(2) + '</div>';
            html += '</div>';
        }

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:16px 20px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:16px;font-weight:700;color:#333">Totalt</div>';
        html += '<div></div>';
        html += '<div style="font-size:16px;font-weight:600;color:#333;text-align:right">' + grandTotalHours.toFixed(1) + ' h</div>';
        html += '<div style="font-size:16px;font-weight:700;color:#AF52DE;text-align:right">' + grandTotalKr.toFixed(2) + ' kr</div>';
        html += '</div>';

        html += '</div>';

        return html;
    };

    // ===== FRÅNVARO FUNCTIONALITY =====
    VR.doFranvaro = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Frånvaro');
        VR.updateLoader(5, 'Letar efter sidan...');

        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseAndShowFranvaro);
        });
    };

    VR.parseAndShowFranvaro = function() {
        VR.updateLoader(95, 'Analyserar frånvaro-data...');

        var franvaroData = [];

        var FRANVARO_TYPES = {
            'L.Föräldraledig >5 dagar': { name: 'Föräldrarledig, lång', icon: '👶' },
            'L.Föräldraledig>5 dagar': { name: 'Föräldrarledig, lång', icon: '👶' },
            'L.Föräldraledig <5 dagar': { name: 'Föräldrarledig, kort', icon: '👶' },
            'L.Föräldraledig<5 dagar': { name: 'Föräldrarledig, kort', icon: '👶' },
            'S.Frånvaro: FRIDAG': { name: 'FP', icon: '🏖️' },
            'S.Frånvaro: FV/FP2/FP-V': { name: 'FPV', icon: '🌴' },
            'L.Vård av barn': { name: 'VAB', icon: '🏥' }
        };

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE' && el.tagName !== 'TR' && el.tagName !== 'TD') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i)) {
                    currentDate = dateMatch[1];
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';
                    var col2 = cells[1] ? cells[1].textContent.trim() : '';

                    if (col1.toLowerCase() === 'löneslag') continue;

                    var matchedType = null;
                    var matchedInfo = null;

                    for (var typeKey in FRANVARO_TYPES) {
                        if (col1.indexOf(typeKey) > -1 || col1 === typeKey) {
                            matchedType = typeKey;
                            matchedInfo = FRANVARO_TYPES[typeKey];
                            break;
                        }
                    }

                    if (!matchedType) {
                        if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('>5') > -1) {
                            matchedInfo = { name: 'Föräldrarledig, lång', icon: '👶' };
                            matchedType = col1;
                        } else if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('<5') > -1) {
                            matchedInfo = { name: 'Föräldrarledig, kort', icon: '👶' };
                            matchedType = col1;
                        } else if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                            matchedInfo = { name: 'FP', icon: '🏖️' };
                            matchedType = col1;
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            matchedInfo = { name: 'FPV', icon: '🌴' };
                            matchedType = col1;
                        } else if (col1.indexOf('Vård av barn') > -1) {
                            matchedInfo = { name: 'VAB', icon: '🏥' };
                            matchedType = col1;
                        }
                    }

                    if (matchedInfo) {
                        franvaroData.push({
                            date: currentDate,
                            originalType: col1,
                            typeName: matchedInfo.name,
                            icon: matchedInfo.icon,
                            time: col2
                        });
                    }
                }
            }
        }

        VR.updateLoader(98, 'Bygger vy...');

        var viewHtml = VR.buildFranvaroView(franvaroData);

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('Frånvaro', franvaroData.length + ' poster', viewHtml);
        }, 300);
    };

    VR.buildFranvaroView = function(franvaroData) {
        if (franvaroData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen frånvaro hittades</div>\
                    <div style="font-size:22px;color:#888">Söker: FP, FPV, VAB, Föräldraledig</div>\
                </div>';
        }

        var totals = {};
        for (var i = 0; i < franvaroData.length; i++) {
            var item = franvaroData[i];
            if (!totals[item.typeName]) {
                totals[item.typeName] = { count: 0, icon: item.icon, totalMinutes: 0 };
            }
            totals[item.typeName].count++;

            var timeMatch = item.time.match(/(\d+):(\d+)/);
            if (timeMatch) {
                var hours = parseInt(timeMatch[1], 10);
                var mins = parseInt(timeMatch[2], 10);
                totals[item.typeName].totalMinutes += hours * 60 + mins;
            }
        }

        var html = '<div style="background:linear-gradient(135deg,#FF6B6B,#EE5A5A);border-radius:30px;padding:40px;margin-bottom:24px;text-align:center;box-shadow:0 10px 40px rgba(255,107,107,0.3)">';
        html += '<div style="font-size:50px;margin-bottom:12px">🏠</div>';
        html += '<div style="font-size:24px;font-weight:600;color:rgba(255,255,255,0.9)">Frånvaro</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#fff;margin:12px 0">' + franvaroData.length + ' dagar</div>';
        html += '</div>';

        var typeKeys = Object.keys(totals);
        if (typeKeys.length > 0) {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px">';

            for (var t = 0; t < typeKeys.length; t++) {
                var typeKey = typeKeys[t];
                var typeData = totals[typeKey];
                var totalHrs = Math.floor(typeData.totalMinutes / 60);
                var totalMins = typeData.totalMinutes % 60;
                var timeStr = totalHrs + ':' + (totalMins < 10 ? '0' : '') + totalMins;

                html += '<div style="background:#fff;border-radius:20px;padding:20px;box-shadow:0 5px 20px rgba(0,0,0,0.08);text-align:center">';
                html += '<div style="font-size:36px;margin-bottom:8px">' + typeData.icon + '</div>';
                html += '<div style="font-size:16px;font-weight:600;color:#333">' + typeKey + '</div>';
                html += '<div style="font-size:28px;font-weight:700;color:#FF6B6B;margin-top:8px">' + typeData.count + '</div>';
                html += '<div style="font-size:13px;color:#8E8E93">(' + timeStr + ')</div>';
                html += '</div>';
            }

            html += '</div>';
        }

        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Frånvaro-typ</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Antal</div>';
        html += '</div>';

        for (var d = 0; d < franvaroData.length; d++) {
            var row = franvaroData[d];
            var bgCol = d % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:15px;color:#333;display:flex;align-items:center;gap:8px"><span>' + row.icon + '</span> ' + row.typeName + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:#FF6B6B;text-align:right">' + row.time + '</div>';
            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    console.log('VR: Löne loaded');
})();
