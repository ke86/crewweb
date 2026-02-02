// VR CrewWeb - Firebase Integration
(function() {
    'use strict';

    var VR = window.VR;

    // ===== FIREBASE CONFIG =====
    VR.FIREBASE_CONFIG = {
        apiKey: "AIzaSyBw8RU0_DgKl4Ft_oRkDPWeaimJ4YJFhMs",
        authDomain: "crewwebvr.firebaseapp.com",
        projectId: "crewwebvr",
        storageBucket: "crewwebvr.firebasestorage.app",
        messagingSenderId: "1084692612109",
        appId: "1:1084692612109:web:d8b596a99858e7d5158144"
    };

    // ===== SHARED PASSWORD =====
    VR.CREW_PASSWORD = 'Gnällsoffan2026!';

    // ===== LOCAL STORAGE KEYS =====
    VR.FB_AUTH_KEY = 'vr_fb_authenticated';
    VR.FB_USER_KEY = 'vr_fb_user';

    // ===== STATE =====
    VR.firebaseReady = false;
    VR.firebaseDb = null;

    // ===== INITIALIZE FIREBASE =====
    VR.initFirebase = function(callback) {
        if (VR.firebaseReady && VR.firebaseDb) {
            if (callback) callback(true);
            return;
        }

        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            console.log('VR: Firebase SDK not loaded yet');
            if (callback) callback(false);
            return;
        }

        try {
            // Initialize Firebase app if not already
            if (!firebase.apps.length) {
                firebase.initializeApp(VR.FIREBASE_CONFIG);
            }

            // Get Firestore
            VR.firebaseDb = firebase.firestore();
            VR.firebaseReady = true;
            console.log('VR: Firebase initialized');

            if (callback) callback(true);
        } catch (e) {
            console.log('VR: Firebase init error:', e);
            if (callback) callback(false);
        }
    };

    // ===== CHECK IF AUTHENTICATED =====
    VR.isFirebaseAuthenticated = function() {
        try {
            return localStorage.getItem(VR.FB_AUTH_KEY) === 'true';
        } catch (e) {
            return false;
        }
    };

    // ===== AUTHENTICATE WITH PASSWORD =====
    VR.authenticateFirebase = function(password) {
        if (password === VR.CREW_PASSWORD) {
            try {
                localStorage.setItem(VR.FB_AUTH_KEY, 'true');
            } catch (e) {}
            return true;
        }
        return false;
    };

    // ===== GET/SET LOCAL USER INFO =====
    VR.getFirebaseUser = function() {
        try {
            var user = localStorage.getItem(VR.FB_USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    };

    VR.setFirebaseUser = function(anstNr, namn) {
        try {
            localStorage.setItem(VR.FB_USER_KEY, JSON.stringify({
                anstNr: anstNr,
                namn: namn
            }));
        } catch (e) {}
    };

    // ===== UPLOAD SCHEMA TO FIREBASE =====
    VR.uploadSchemaToFirebase = function(callback) {
        if (!VR.firebaseReady || !VR.firebaseDb) {
            console.log('VR: Firebase not ready');
            if (callback) callback(false, 'Firebase ej redo');
            return;
        }

        var user = VR.getFirebaseUser();
        if (!user || !user.anstNr) {
            if (callback) callback(false, 'Ingen användare');
            return;
        }

        // Get schema data
        var schemaData = VR.allSchemaData || {};
        if (Object.keys(schemaData).length === 0) {
            if (callback) callback(false, 'Inget schema laddat');
            return;
        }

        var batch = VR.firebaseDb.batch();
        var userRef = VR.firebaseDb.collection('users').doc(user.anstNr);

        // Update user info
        batch.set(userRef, {
            namn: user.namn,
            anstNr: user.anstNr,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Upload each day's schedule
        var count = 0;
        for (var dateKey in schemaData) {
            if (schemaData.hasOwnProperty(dateKey)) {
                var entries = schemaData[dateKey];
                if (entries && entries.length > 0) {
                    var entry = entries[0]; // Take first entry for the day

                    var dayRef = VR.firebaseDb.collection('schedules')
                        .doc(user.anstNr)
                        .collection('days')
                        .doc(dateKey);

                    batch.set(dayRef, {
                        date: dateKey,
                        tur: entry.tn || '',
                        tid: entry.pr || '',
                        ps: entry.ps || '',
                        cd: entry.cd || '',
                        isFriday: VR.isFriday ? VR.isFriday(entry.ps, entry.cd) : false,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    count++;
                }
            }
        }

        // Commit batch
        batch.commit()
            .then(function() {
                console.log('VR: Uploaded', count, 'schedule days');
                if (callback) callback(true, count + ' dagar uppladdade');
            })
            .catch(function(error) {
                console.log('VR: Upload error:', error);
                if (callback) callback(false, 'Uppladdningsfel');
            });
    };

    // ===== GET ALL USERS =====
    VR.getFirebaseUsers = function(callback) {
        if (!VR.firebaseReady || !VR.firebaseDb) {
            if (callback) callback([]);
            return;
        }

        VR.firebaseDb.collection('users')
            .get()
            .then(function(snapshot) {
                var users = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    users.push({
                        anstNr: doc.id,
                        namn: data.namn || '',
                        lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : null
                    });
                });
                if (callback) callback(users);
            })
            .catch(function(error) {
                console.log('VR: Error getting users:', error);
                if (callback) callback([]);
            });
    };

    // ===== GET SCHEDULES FOR A DATE =====
    VR.getSchedulesForDate = function(dateStr, callback) {
        if (!VR.firebaseReady || !VR.firebaseDb) {
            if (callback) callback([]);
            return;
        }

        // First get all users
        VR.getFirebaseUsers(function(users) {
            if (users.length === 0) {
                if (callback) callback([]);
                return;
            }

            var schedules = [];
            var completed = 0;

            users.forEach(function(user) {
                VR.firebaseDb.collection('schedules')
                    .doc(user.anstNr)
                    .collection('days')
                    .doc(dateStr)
                    .get()
                    .then(function(doc) {
                        if (doc.exists) {
                            var data = doc.data();
                            schedules.push({
                                anstNr: user.anstNr,
                                namn: user.namn,
                                tur: data.tur || '',
                                tid: data.tid || '',
                                ps: data.ps || '',
                                cd: data.cd || '',
                                isFriday: data.isFriday || false,
                                lastUpdated: user.lastUpdated
                            });
                        } else {
                            // User exists but no schedule for this date
                            schedules.push({
                                anstNr: user.anstNr,
                                namn: user.namn,
                                tur: null,
                                tid: null,
                                noData: true,
                                lastUpdated: user.lastUpdated
                            });
                        }

                        completed++;
                        if (completed === users.length) {
                            // Sort by name
                            schedules.sort(function(a, b) {
                                return (a.namn || '').localeCompare(b.namn || '');
                            });
                            if (callback) callback(schedules);
                        }
                    })
                    .catch(function(error) {
                        completed++;
                        if (completed === users.length) {
                            if (callback) callback(schedules);
                        }
                    });
            });
        });
    };

    // ===== GET SCHEDULES FOR MONTH =====
    VR.getSchedulesForMonth = function(year, month, callback) {
        if (!VR.firebaseReady || !VR.firebaseDb) {
            if (callback) callback({});
            return;
        }

        // Get all users first
        VR.getFirebaseUsers(function(users) {
            if (users.length === 0) {
                if (callback) callback({});
                return;
            }

            var allSchedules = {};
            var completed = 0;

            users.forEach(function(user) {
                // Get all days for this user in this month
                var monthPrefix = ('0' + (month + 1)).slice(-2) + '-' + year;

                VR.firebaseDb.collection('schedules')
                    .doc(user.anstNr)
                    .collection('days')
                    .get()
                    .then(function(snapshot) {
                        snapshot.forEach(function(doc) {
                            var dateStr = doc.id;
                            // Check if this date is in the target month
                            if (dateStr.indexOf(monthPrefix) > -1) {
                                if (!allSchedules[dateStr]) {
                                    allSchedules[dateStr] = [];
                                }
                                var data = doc.data();
                                allSchedules[dateStr].push({
                                    anstNr: user.anstNr,
                                    namn: user.namn,
                                    tur: data.tur || '',
                                    tid: data.tid || '',
                                    ps: data.ps || '',
                                    isFriday: data.isFriday || false
                                });
                            }
                        });

                        completed++;
                        if (completed === users.length) {
                            if (callback) callback(allSchedules);
                        }
                    })
                    .catch(function(error) {
                        completed++;
                        if (completed === users.length) {
                            if (callback) callback(allSchedules);
                        }
                    });
            });
        });
    };

    console.log('VR: Firebase module loaded');
})();
