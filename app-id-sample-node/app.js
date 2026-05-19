// ===============================================
// GREEN VALLY UNIVERSITY - FINAL SECURE app.js
// ===============================================

// ================= IMPORTS =====================

// const config = require('./localdev-config.json')
// ================= IMPORTS =====================

// ================= IMPORTS =====================

let config = {};
try {
    config = require('./localdev-config.json');
} catch (e) {
    console.log("⚠️ localdev-config.json missing. Using Production Hardcoded Config.");
    config = {
        // AppID credentials
        clientId: "476180be-aea4-4d77-8cee-7a923d51245c",
        oauthServerUrl: "https://au-syd.appid.cloud.ibm.com/oauth/v4/178fa463-5e28-4a6e-a036-b1e5226b0fb9",
        profilesUrl: "https://au-syd.appid.cloud.ibm.com",
        secret: "YjgwMWI0MDAtNWViNy00YTE5LWI0ODItMTNzgxMGViMTVj",
        tenantId: "178fa463-5e28-4a6e-a036-b1e5226b0fb9",
        redirectUri: "https://university-backend-dx02.onrender.com/ibm/cloud/appid/callback", 

        // Cloudant credentials
        CLOUDANT_APIKEY: "DboYxbSOOVzOR9toVhQQCuWNbCaPnkgVb9k8rq6i1Lmg",
        CLOUDANT_URL: "https://ac4d69ab-ab0c-41d7-aacf-2329e695e676-bluemix.cloudantnosqldb.appdomain.cloud"
    };
}

const { CloudantV1 } = require('@ibm-cloud/cloudant');

const { IamAuthenticator } = require('ibm-cloud-sdk-core');

const express = require("express");

const session = require("express-session");

const passport = require("passport");

const appID = require("ibmcloud-appid");


// ================= APP SETUP ===================

const WebAppStrategy = appID.WebAppStrategy;

const app = express();

const CALLBACK_URL = "/ibm/cloud/appid/callback";

const port = process.env.PORT || 3000;


// ================= EXPRESS =====================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// ONLY PUBLIC FOLDER STATIC


// ================= CLOUDANT ====================

const cloudant = CloudantV1.newInstance({

    authenticator: new IamAuthenticator({

        apikey: config.CLOUDANT_APIKEY,

    }),

});

cloudant.setServiceUrl(config.CLOUDANT_URL);

const studentDB = "students";

const teacherDB = "teachers";

const feeDB = "fees";

const userDB = "users";


// ================= DATABASE CREATE ====================

async function createDatabases() {

    const databases = [
        studentDB,
        teacherDB,
        feeDB,
        userDB
    ];

    for (let db of databases) {

        try {

            await cloudant.putDatabase({
                db: db
            });

            console.log(`✅ ${db} Created`);

        }
        catch (err) {

            if (err.code === 412) {

                console.log(`✅ ${db} Already Exists`);

            }
            else {

                console.log(err);

            }

        }

    }

}

createDatabases();


// ================= INDEX CREATE ====================

async function createIndex() {

    try {

        await cloudant.postIndex({

            db: studentDB,

            index: {
                fields: ["aadhar"]
            },

            name: "student-index",

            type: "json"

        });

        console.log("✅ Index Created");

    }
    catch (err) {

        console.log(err);

    }

}

createIndex();


// ================= SESSION ====================

app.use(session({

    secret: "greenvallysecret",

    resave: true,   //change true

    saveUninitialized: true,    //change

    proxy: true,

    // cookie: {

    //     secure: false,

    //     httpOnly: true,

    //     maxAge: 1000 * 60 * 60

    // }

}));


// ================= PASSPORT ====================

app.use(passport.initialize());

app.use(passport.session());

let webAppStrategy = new WebAppStrategy(
    getAppIDConfig()
);

passport.use(webAppStrategy);

passport.serializeUser((user, cb) => cb(null, user));

passport.deserializeUser((obj, cb) => cb(null, obj));


// ================= AUTH CHECK ====================

function isAuthenticated(req, res, next) {

    if (req.isAuthenticated()) {

        return next();

    }

    res.redirect("/login");

}


// ================= ADMIN CHECK ====================

function isAdmin(req, res, next) {

    if (req.session.isAdmin) {

        return next();

    }

    res.redirect("/adminlogin.html");

}


// ================= APP ID CALLBACK ====================

app.get(

    CALLBACK_URL,

    passport.authenticate(
        WebAppStrategy.STRATEGY_NAME,
        {
            failureRedirect: "/error",
            session: false  //false
        }
    ),

    // (req, res) => {

    //     res.redirect(
    //         "/protected/protected.html"
    //     );

    // }

);

app.use("/protected", passport.authenticate(WebAppStrategy.STRATEGY_NAME, { session: false }));


app.use(express.static("public"));
app.use('/protected', express.static("protected"));


// ================= APP ID LOGIN ====================

app.get(
    "/login",

    passport.authenticate(
        WebAppStrategy.STRATEGY_NAME
    )

);


// ================= PROTECTED STUDENT PAGE ====================

app.get(
    "/protected/protected.html",
    isAuthenticated,
    (req, res) => {

        res.sendFile(
            __dirname +
            "/protected/protected.html"
        );

    }
);


// ================= ADMIN PAGE ====================

app.get(
    "/protected/admin.html",
    isAdmin,
    (req, res) => {

        res.sendFile(
            __dirname +
            "/protected/admin.html"
        );

    }
);


// ================= ADMIN LOGIN ====================

const ADMIN = {

    email: "office@greenvally.com",

    password: "Green@2026"

};


// ================= ADMIN LOGIN API ====================

app.post("/admin/login", (req, res) => {

    const { email, password } = req.body;

    if (
        email === ADMIN.email &&
        password === ADMIN.password
    ) {

        req.session.isAdmin = true;

        req.session.save(() => {

            res.json({
                success: true
            });

        });

    }
    else {

        res.json({
            success: false
        });

    }

});


// ================= LOGOUT ====================

// app.get("/logout", (req, res) => {

//     req.logout(() => {

//         req.session.destroy(() => {

//             res.clearCookie("connect.sid");

//             res.clearCookie("refreshToken");

//             res.redirect("/");

//         });

//     });

// });

app.get("/logout", (req, res) => {
	//Note: if you enabled SSO for Cloud Directory be sure to use webAppStrategy.logoutSSO instead.
	req._sessionManager = false;
	WebAppStrategy.logout(req);
	res.clearCookie("refreshToken");
	res.redirect("/");
});


// ================= GET USER PROFILE ====================

// app.get(
//     "/protected/api/idPayload",
//     isAuthenticated,
//     async (req, res) => {

//         try {

//             const user =
//                 req.session[
//                     WebAppStrategy.AUTH_CONTEXT
//                 ].identityTokenPayload;

//             const userData = {

//                 _id: user.sub,

//                 name: user.name,

//                 email: user.email,

//                 timestamp: new Date()

//             };

//             try {

//                 await cloudant.postDocument({

//                     db: userDB,

//                     document: userData

//                 });

//                 console.log("✅ User Stored");

//             }
//             catch (err) {

//                 console.log("User already exists");

//             }

//             res.send(user);

//         }
//         catch (err) {

//             console.log(err);

//             res.status(500).send("Error");

//         }

//     }
// );


app.get("/protected/api/idPayload", (req, res) => {
	res.send(req.session[WebAppStrategy.AUTH_CONTEXT].identityTokenPayload);
});

// ================= REGISTER STUDENT ====================

app.post("/api/register", async (req, res) => {

    const data = req.body;

    try {

        const existing =
            await cloudant.postFind({

                db: studentDB,

                selector: {
                    aadhar: data.aadhar
                }

            });

        if (
            existing.result.docs.length > 0
        ) {

            return res.json({

                message:
                    "❌ Aadhaar Already Exists"

            });

        }

        const result =
            await cloudant.postFind({

                db: studentDB,

                selector: {}

            });

        let count =
            result.result.docs.length;

        let newStudent = {

            _id:
                "student_" + (count + 1),

            type: "student",

            studentId:
                "GVU/" +
                String(count + 1)
                .padStart(3, '0'),

            name: data.name,

            aadhar: data.aadhar,

            email: data.email,

            phone: data.phone,

            dob: data.dob,

            gender: data.gender,

            course: data.course,

            fatherName:
                data.fatherName,

            motherName:
                data.motherName,

            parentPhone:
                data.parentPhone,

            address: data.address,

            createdAt: new Date()

        };

        await cloudant.postDocument({

            db: studentDB,

            document: newStudent

        });

        res.json({

            message:
                "✅ Student Registered Successfully",

            studentId:
                newStudent.studentId

        });

    }
    catch (err) {

        console.log(err);

        res.status(500).send("Error");

    }

});


// ================= STUDENT COUNT ====================

app.get(
    "/api/students/count",
    async (req, res) => {

        try {

            const result =
                await cloudant.postFind({

                    db: studentDB,

                    selector: {}

                });

            res.json({

                total:
                    result.result.docs.length

            });

        }
        catch (err) {

            console.log(err);

            res.status(500).send("Error");

        }

    }
);


// ================= GET ALL STUDENTS ====================

app.get(
    "/api/students",
    isAdmin,
    async (req, res) => {

        try {

            const result =
                await cloudant.postFind({

                    db: studentDB,

                    selector: {}

                });

            res.json(result.result.docs);

        }
        catch (err) {

            console.log(err);

            res.status(500).send("Error");

        }

    }
);


// ================= ADD TEACHER ====================

app.post(
    "/add-teacher",
    isAdmin,
    async (req, res) => {

        try {

            const teacherData = {

                type: "teacher",

                name: req.body.name,

                subject:
                    req.body.subject,

                mobile:
                    req.body.mobile,

                email:
                    req.body.email,

                qualification:
                    req.body.qualification,

                createdAt:
                    new Date()

            };

            await cloudant.postDocument({

                db: teacherDB,

                document: teacherData

            });

            res.json({

                success: true,

                message:
                    "Teacher Added Successfully"

            });

        }
        catch (err) {

            console.log(err);

            res.status(500).json(err);

        }

    }
);


// ================= GET TEACHERS ====================

app.get("/teachers", async (req, res) => {

    try {

        const data =
            await cloudant.postFind({

                db: teacherDB,

                selector: {}

            });

        res.json(data.result.docs);

    }
    catch (err) {

        console.log(err);

        res.status(500).json(err);

    }

});


// ================= TEACHER COUNT ====================

app.get(
    "/teacher-count",
    async (req, res) => {

        try {

            const data =
                await cloudant.postFind({

                    db: teacherDB,

                    selector: {}

                });

            res.json({

                totalTeachers:
                    data.result.docs.length

            });

        }
        catch (err) {

            console.log(err);

            res.status(500).json(err);

        }

    }
);


// ================= DELETE TEACHER ====================

app.delete(
    "/delete-teacher/:id",
    isAdmin,
    async (req, res) => {

        try {

            const id = req.params.id;

            const doc =
                await cloudant.getDocument({

                    db: teacherDB,

                    docId: id

                });

            await cloudant.deleteDocument({

                db: teacherDB,

                docId: id,

                rev: doc.result._rev

            });

            res.json({

                success: true,

                message:
                    "Teacher Deleted"

            });

        }
        catch (err) {

            console.log(err);

            res.status(500).json(err);

        }

    }
);


// ================= ADD FEE ====================

app.post(
    "/add-fee",
    isAdmin,
    async (req, res) => {

        try {

            const data = req.body;

            const feeData = {

                type: "fee",

                studentName:
                    data.studentName,

                studentId:
                    data.studentId,

                course:
                    data.course,

                totalFee:
                    Number(data.totalFee),

                paidFee:
                    Number(data.paidFee),

                remainingFee:
                    Number(data.totalFee)
                    -
                    Number(data.paidFee),

                createdAt:
                    new Date()

            };

            await cloudant.postDocument({

                db: feeDB,

                document: feeData

            });

            res.json({

                success: true,

                message:
                    "Fee Added Successfully"

            });

        }
        catch (err) {

            console.log(err);

            res.status(500).json(err);

        }

    }
);


// ================= GET FEES ====================

app.get("/fees", async (req, res) => {

    try {

        const data =
            await cloudant.postFind({

                db: feeDB,

                selector: {}

            });

        res.json(data.result.docs);

    }
    catch (err) {

        console.log(err);

        res.status(500).json(err);

    }

});


// ================= FEES TOTAL ====================

app.get(
    "/fees-total",
    async (req, res) => {

        try {

            const data =
                await cloudant.postFind({

                    db: feeDB,

                    selector: {}

                });

            let total = 0;

            data.result.docs.forEach(
                (fee) => {

                    total +=
                        Number(fee.paidFee);

                }
            );

            res.json({ total });

        }
        catch (err) {

            console.log(err);

            res.status(500).json(err);

        }

    }
);


// ================= DELETE FEE ====================

app.delete(
    "/delete-fee/:id",
    isAdmin,
    async (req, res) => {

        try {

            const id = req.params.id;

            const doc =
                await cloudant.getDocument({

                    db: feeDB,

                    docId: id

                });

            await cloudant.deleteDocument({

                db: feeDB,

                docId: id,

                rev: doc.result._rev

            });

            res.json({
                success: true
            });

        }
        catch (err) {

            console.log(err);

            res.status(500).json(err);

        }

    }
);


// ================= UPDATE OLD IDS ====================

app.get(
    "/update-old-ids",
    isAdmin,
    async (req, res) => {

        try {

            const result =
                await cloudant.postFind({

                    db: studentDB,

                    selector: {}

                });

            const students =
                result.result.docs;

            for (
                let i = 0;
                i < students.length;
                i++
            ) {

                const student =
                    students[i];

                student.studentId =
                    "GVU/" +
                    String(i + 1)
                    .padStart(3, '0');

                await cloudant.putDocument({

                    db: studentDB,

                    docId: student._id,

                    document: student

                });

            }

            res.send(
                "✅ Old IDs Updated"
            );

        }
        catch (err) {

            console.log(err);

            res.status(500).send("Error");

        }

    }
);


// ================= STUDENT FEE STATUS ====================

app.get(
    "/student-fee-status/:studentId",
    async (req, res) => {

        try {

            const studentId =
                req.params.studentId;

            const data =
                await cloudant.postFind({

                    db: feeDB,

                    selector: {
                        studentId: studentId
                    }

                });

            if (
                data.result.docs.length === 0
            ) {

                return res.json({
                    status: "Pending"
                });

            }

            const fee =
                data.result.docs[0];

            if (
                Number(fee.remainingFee) <= 0
            ) {

                return res.json({
                    status: "Paid"
                });

            }

            return res.json({
                status: "Partial"
            });

        }
        catch (err) {

            console.log(err);

            res.status(500).send("Error");

        }

    }
);


// ================= STREAM TOTAL ====================

app.get("/stream-total", (req, res) => {

    res.json({
        totalStreams: 15
    });

});


// ================= STREAM COUNT ====================

app.get("/stream-count", async (req, res) => {

    try {

        const response = await cloudant.postFind({

            db: studentDB,

            selector: {}

        });

        let students = response.result.docs;

        let counts = {

            BCA: 0,
            BBA: 0,
            BCOM: 0,
            BA: 0,
            BSC: 0,
            BTECH: 0,
            MCA: 0,
            MA: 0,
            DIPLOMA: 0,
            ITI: 0,
            LAW: 0,
            BPHARMA: 0,
            DPHARMA: 0,
            NURSING: 0,
            MCOM: 0

        };

        students.forEach(student => {

            let course =
                student.course;

            if(course){

                course =
                    course.toUpperCase();

                if(counts[course] !== undefined){

                    counts[course]++;

                }

            }

        });

        res.json(counts);

    }

    catch(err){

        console.log(err);

        res.status(500).json({
            error: "Failed to fetch stream count"
        });

    }

});

// ================= ERROR PAGE ====================

app.get("/error", (req, res) => {

    res.send("Authentication Error");

});


// ================= APP ID CONFIG ====================

// function getAppIDConfig() {

//     let cfg;

//     try {

//         cfg = require(
//             './localdev-config.json'
//         );

//     }
//     catch (e) {

//         if (
//             process.env.APPID_SERVICE_BINDING
//         ) {

//             cfg = JSON.parse(
//                 process.env.APPID_SERVICE_BINDING
//             );

//             cfg.redirectUri =
//                 process.env.redirectUri;

//         }
//         else {

//             let vcapApplication =
//                 JSON.parse(
//                     process.env[
//                         "VCAP_APPLICATION"
//                     ]
//                 );

//             return {

//                 redirectUri:
//                     "https://" +
//                     vcapApplication[
//                         "application_uris"
//                     ][0]
//                     +
//                     CALLBACK_URL

//             };

//         }

//     }

//     return cfg;

// }


function getAppIDConfig() {
	let config;

	try {
		// if running locally we'll have the local config file
		config = require('./localdev-config.json');
	} catch (e) {
		if (process.env.APPID_SERVICE_BINDING) { // if running on Kubernetes this env variable would be defined
			config = JSON.parse(process.env.APPID_SERVICE_BINDING);
			config.redirectUri = process.env.redirectUri;
		} else { // running on CF
			let vcapApplication = JSON.parse(process.env["VCAP_APPLICATION"]);
			return { "redirectUri": "https://" + vcapApplication["application_uris"][0] + CALLBACK_URL };
		}
	}
	return config;
}

// ================= DELETE STUDENT ====================
// ================= DELETE STUDENT ====================

app.delete(
    "/delete-student/:id",
    isAdmin,
    async (req, res) => {

        try {

            const id = req.params.id;

            // ================= GET STUDENT =================

            const studentDoc =
                await cloudant.getDocument({

                    db: studentDB,

                    docId: id

                });

            const student =
                studentDoc.result;

            const studentId =
                student.studentId;

            // ================= DELETE STUDENT =================

            await cloudant.deleteDocument({

                db: studentDB,

                docId: id,

                rev: student._rev

            });

            // ================= FIND FEES =================

            const feeData =
                await cloudant.postFind({

                    db: feeDB,

                    selector: {
                        studentId: studentId
                    }

                });

            // ================= DELETE ALL FEES =================

            for(
                let fee of feeData.result.docs
            ){

                await cloudant.deleteDocument({

                    db: feeDB,

                    docId: fee._id,

                    rev: fee._rev

                });

            }

            res.json({

                success: true,

                message:
                    "Student And Fee Deleted"

            });

        }
        catch (err) {

            console.log(err);

            res.status(500).json({

                success: false,

                message:
                    "Delete Failed"

            });

        }

    }
);

// ================= START SERVER ====================

app.listen(port, () => {

    console.log("================================");

    console.log("✅ Server Running");

    console.log(
        "🌍 http://localhost:" + port
    );

    console.log("================================");

});