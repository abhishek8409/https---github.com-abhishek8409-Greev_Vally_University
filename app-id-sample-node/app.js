



// ✅ UPDATED: Load config first
const config = require('./localdev-config.json');

// ✅ UPDATED: Cloudant imports
const { CloudantV1 } = require('@ibm-cloud/cloudant');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const appID = require("ibmcloud-appid");

const WebAppStrategy = appID.WebAppStrategy;
const app = express();

const CALLBACK_URL = "/ibm/cloud/appid/callback";
const port = process.env.PORT || 3000;

//
// ✅ UPDATED: Cloudant configuration (using JSON config)
//
const cloudant = CloudantV1.newInstance({
  authenticator: new IamAuthenticator({
    apikey: config.CLOUDANT_APIKEY,
  }),
});

cloudant.setServiceUrl(config.CLOUDANT_URL);

const dbName = "users";

async function createDatabase() {
  try {
    await cloudant.putDatabase({ db: dbName });
    console.log("Database created");
  } catch (err) {
    if (err.code === 412) {
      console.log("Database already exists");
    } else {
      console.error(err);
    }
  }
}
createDatabase();

//
// EXPRESS + APP ID SETUP
//
app.use(session({
  secret: "123456",
  resave: true,
  saveUninitialized: true,
  proxy: true
}));

app.use(passport.initialize());
app.use(passport.session());

let webAppStrategy = new WebAppStrategy(getAppIDConfig());
passport.use(webAppStrategy);

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((obj, cb) => cb(null, obj));

app.get(CALLBACK_URL,
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    failureRedirect: '/error',
    session: false
  })
);

// ✅ Protect all /protected routes
app.use("/protected",
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, { session: false })
);

app.use(express.static("public"));
app.use('/protected', express.static("protected"));

app.get("/logout", (req, res) => {
  req._sessionManager = false;
  WebAppStrategy.logout(req);
  res.clearCookie("refreshToken");
  res.redirect("/");
});

//
// ✅ UPDATED: STORE USER HERE (CORRECT PLACE)
//
app.get("/protected/api/idPayload", async (req, res) => {

  const user = req.session[WebAppStrategy.AUTH_CONTEXT].identityTokenPayload;

  const userData = {
    _id: user.sub,
    name: user.name,
    email: user.email,
    timestamp: new Date()
  };

  try {
    await cloudant.postDocument({
      db: dbName,
      document: userData,
    });
    console.log("User stored in Cloudant");
  } catch (err) {
    console.error("Error storing user:", err);
  }

  res.send(user);
});

app.get('/error', (req, res) => {
  res.send('Authentication Error');
});

app.listen(port, () => {
  console.log("Listening on http://localhost:" + port);
});

//
// CONFIG FUNCTION
//
function getAppIDConfig() {
  let cfg;

  try {
    cfg = require('./localdev-config.json');
  } catch (e) {
    if (process.env.APPID_SERVICE_BINDING) {
      cfg = JSON.parse(process.env.APPID_SERVICE_BINDING);
      cfg.redirectUri = process.env.redirectUri;
    } else {
      let vcapApplication = JSON.parse(process.env["VCAP_APPLICATION"]);
      return {
        "redirectUri":
          "https://" + vcapApplication["application_uris"][0] + CALLBACK_URL
      };
    }
  }
  return cfg;
}

// add new  
// *********************************************

app.use(express.json()); // IMPORTANT

// 👉 Register Student API
app.post("/api/register", async (req, res) => {

  const data = req.body;

  try {

    // 👉 count existing students
    const result = await cloudant.postFind({
      db: dbName,
      selector: { type: "student" }
    });

    let count = result.result.docs.length;

    let newStudent = {
      _id: "student_" + (count + 1), // 👉 unique ID
      type: "student",
      studentId: count + 1,
      ...data,
      createdAt: new Date()
    };

    await cloudant.postDocument({
      db: dbName,
      document: newStudent
    });

    res.json({
      message: "Student Registered",
      studentId: newStudent.studentId
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }

});



// *******count student

app.get("/api/students/count", async (req, res) => {
  try {
    const result = await cloudant.postFind({
      db: dbName,
      selector: { type: "student" }
    });

    res.json({
      total: result.result.docs.length
    });

  } catch (err) {
    res.status(500).send("Error");
  }
});



app.use("/protected",
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, { session: false })
);

// ******

// admin login page

app.use(express.json());

// 👉 Hardcoded Admin (simple version)
const ADMIN = {
  email: "admin@gmail.com",
  password: "12345"
};

// 👉 Login API
app.post("/admin/login", (req, res) => {

  const { email, password } = req.body;

  if(email === ADMIN.email && password === ADMIN.password){

    req.session.isAdmin = true;

    res.json({ success: true });

  } else {
    res.json({ success: false });
  }

});


function isAdmin(req, res, next){
    if(req.session.isAdmin){
        next();
    } else {
        res.redirect("/admin-login.html");
    }
}

// 👉 protect admin page
app.use("/protected/admin.html", isAdmin);

//******************* */