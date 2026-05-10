// ===============================================
// GREEN VALLY UNIVERSITY - FINAL app.js
// ===============================================

// ================= IMPORTS =====================

const config = require('./localdev-config.json');

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


app.use(express.static('public'));

// ================= CLOUDANT ====================

const cloudant = CloudantV1.newInstance({

    authenticator: new IamAuthenticator({

        apikey: config.CLOUDANT_APIKEY,

    }),

});

cloudant.setServiceUrl(config.CLOUDANT_URL);

const dbName = "users";

// ================= DATABASE CREATE ====================

async function createDatabase() {

    try {

        await cloudant.putDatabase({

            db: dbName

        });

        console.log("✅ Database Created");

    } catch (err) {

        if (err.code === 412) {

            console.log("✅ Database Already Exists");

        } else {

            console.log(err);

        }

    }

}

createDatabase();

// ================= INDEX CREATE ====================

async function createIndex() {

    try {

        await cloudant.postIndex({

            db: dbName,

            index: {

                fields: ["type", "aadhar"]

            },

            name: "student-index",

            type: "json"

        });

        console.log("✅ Index Created");

    } catch (err) {

        console.log(err);

    }

}

createIndex();

// ================= EXPRESS ====================

app.use(express.json());

app.use(express.urlencoded({

    extended: true

}));

// ================= SESSION ====================

app.use(session({

    secret: "greenvallysecret",

    resave: false,

    saveUninitialized: false,

    proxy: true

}));

// ================= PASSPORT ====================

app.use(passport.initialize());

app.use(passport.session());

let webAppStrategy = new WebAppStrategy(getAppIDConfig());

passport.use(webAppStrategy);

passport.serializeUser((user, cb) => cb(null, user));

passport.deserializeUser((obj, cb) => cb(null, obj));

// ================= APP ID CALLBACK ====================

app.get(

    CALLBACK_URL,

    passport.authenticate(

        WebAppStrategy.STRATEGY_NAME,

        {

            failureRedirect: "/error",

            session: false

        }

    )

);

// ================= PROTECT STUDENT PAGE ====================

app.use(

    "/protected/protected.html",

    passport.authenticate(

        WebAppStrategy.STRATEGY_NAME,

        {

            session: false

        }

    )

);

// ================= STATIC FOLDERS ====================

app.use(express.static("public"));

app.use("/protected", express.static("protected"));

// ================= ADMIN LOGIN ====================

const ADMIN = {

    email: "office@greenvally.com",

    password: "Green@2026"

};

// ================= ADMIN MIDDLEWARE ====================

function isAdmin(req, res, next) {

    if (req.session.isAdmin) {

        next();

    } else {

        res.redirect("/adminlogin.html");

    }

}
app.get("/protected/admin.html", isAdmin, (req, res) => {

    res.sendFile(__dirname + "/protected/admin.html");

});


app.use("/api/students", isAdmin);

// ================= ADMIN LOGIN API ====================

app.post("/admin/login", (req, res) => {

    const {

        email,

        password

    } = req.body;

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

    } else {

        res.json({

            success: false

        });

    }

});

// ================= LOGOUT ====================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.clearCookie("connect.sid");

        res.clearCookie("refreshToken");

        res.redirect("/");

    });

});

// ================= GET USER PROFILE ====================

app.get("/protected/api/idPayload", async (req, res) => {

    try {

        if (!req.session[WebAppStrategy.AUTH_CONTEXT]) {

            return res.status(401).send("Not Logged In");

        }

        const user = req.session[WebAppStrategy.AUTH_CONTEXT]

            .identityTokenPayload;

        const userData = {

            _id: user.sub,

            name: user.name,

            email: user.email,

            timestamp: new Date()

        };

        try {

            await cloudant.postDocument({

                db: dbName,

                document: userData

            });

            console.log("✅ User Stored");

        } catch (err) {

            console.log("User already exists");

        }

        res.send(user);

    } catch (err) {

        console.log(err);

        res.status(500).send("Error");

    }

});

// ================= REGISTER STUDENT ====================

app.post("/api/register", async (req, res) => {

    const data = req.body;

    try {

        // Aadhaar duplicate check

        const existing = await cloudant.postFind({

            db: dbName,

            selector: {

                aadhar: data.aadhar

            }

        });

        if (existing.result.docs.length > 0) {

            return res.json({

                message: "❌ Aadhaar Already Exists"

            });

        }

        // Count students

        const result = await cloudant.postFind({

            db: dbName,

            selector: {

                type: "student"

            }

        });

        let count = result.result.docs.length;

        // New Student Object

        let newStudent = {

            _id: "student_" + (count + 1),

            type: "student",

            studentId: count + 1,

            name: data.name,

            aadhar: data.aadhar,

            email: data.email,

            phone: data.phone,

            dob: data.dob,

            gender: data.gender,

            course: data.course,

            fatherName: data.fatherName,

            motherName: data.motherName,

            parentPhone: data.parentPhone,

            address: data.address,

            createdAt: new Date()

        };

        // Save Student

        await cloudant.postDocument({

            db: dbName,

            document: newStudent

        });

        res.json({

            message: "✅ Student Registered Successfully",

            studentId: newStudent.studentId

        });

    } catch (err) {

        console.log(err);

        res.status(500).send("Error");

    }

});

// ================= STUDENT COUNT ====================

app.get("/api/students/count", async (req, res) => {

    try {

        const result = await cloudant.postFind({

            db: dbName,

            selector: {

                type: "student"

            }

        });

        res.json({

            total: result.result.docs.length

        });

    } catch (err) {

        console.log(err);

        res.status(500).send("Error");

    }

});

// ================= GET ALL STUDENTS ====================

app.get("/api/students", isAdmin, async (req, res) => {

    try {

        const result = await cloudant.postFind({

            db: dbName,

            selector: {

                type: "student"

            }

        });

        res.json(result.result.docs);

    } catch (err) {

        console.log(err);

        res.status(500).send("Error");

    }

});

// ================= ERROR PAGE ====================

app.get("/error", (req, res) => {

    res.send("Authentication Error");

});

// ================= START SERVER ====================

app.listen(port, () => {

    console.log("================================");

    console.log("✅ Server Running");

    console.log("🌍 http://localhost:" + port);

    console.log("================================");

});

// ================= APP ID CONFIG ====================

function getAppIDConfig() {

    let cfg;

    try {

        cfg = require('./localdev-config.json');

    } catch (e) {

        if (process.env.APPID_SERVICE_BINDING) {

            cfg = JSON.parse(

                process.env.APPID_SERVICE_BINDING

            );

            cfg.redirectUri = process.env.redirectUri;

        } else {

            let vcapApplication = JSON.parse(

                process.env["VCAP_APPLICATION"]

            );

            return {

                redirectUri:

                    "https://" +

                    vcapApplication["application_uris"][0] +

                    CALLBACK_URL

            };

        }

    }

    return cfg;

}

//teachers page



// Add Teacher

app.post('/add-teacher', async (req,res)=>{

    try{

        const teacherData = {

            type:'teacher',

            name:req.body.name,

            subject:req.body.subject,

            mobile:req.body.mobile,

            email:req.body.email,

            qualification:req.body.qualification

        };

        const response = await cloudant.postDocument({

            db:dbName,

            document:teacherData

        });

        res.json({

            success:true,

            message:'Teacher Added Successfully'

        });

    }
    catch(err){

        res.status(500).json(err);

    }

});


// Get Teachers

app.get('/teachers', async (req,res)=>{

    try{

        const data = await cloudant.postFind({

            db:dbName,

            selector:{
                type:'teacher'
            }

        });

        res.json(data.result.docs);

    }
    catch(err){

        res.status(500).json(err);

    }

});


// Teacher Count

app.get('/teacher-count', async (req,res)=>{

    try{

        const data = await cloudant.postFind({

            db:dbName,

            selector:{
                type:'teacher'
            }

        });

        res.json({

            totalTeachers:data.result.docs.length

        });

    }
    catch(err){

        res.status(500).json(err);

    }

});


// Delete Teacher

app.delete('/delete-teacher/:id', async (req,res)=>{

    try{

        const id = req.params.id;

        const doc = await cloudant.getDocument({

            db:dbName,

            docId:id

        });

        await cloudant.deleteDocument({

            db:dbName,

            docId:id,

            rev:doc.result._rev

        });

        res.json({

            success:true,

            message:'Teacher Deleted'

        });

    }
    catch(err){

        res.status(500).json(err);

    }

});
