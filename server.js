const express = require("express");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path')

const app = express();
const port = 80;

app.use(session({
    secret: 'Omi_trek&@79127#$',
    resave: true,
    saveUninitialized: true
}));
// Middleware to check if the User is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
      return next();
    } else {
      res.redirect('/login');
    }
};

app.use('/styles',express.static(path.join(__dirname,'styles')))
app.use('/def-assets',express.static(path.join(__dirname,'def-assets')))
app.use('/images',express.static(path.join(__dirname,'images')))
app.use('/script',express.static(path.join(__dirname,'script')))

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','home.html'))
})
app.get('/user',isAuthenticated,(req,res)=>{
    res.sendFile(path.join(__dirname,'src','user.html'))
})
app.get('/register',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','signupform.html'))
})
app.get('/login',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','loginform.html'))
})
app.get('/otpform',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','otp.html'))
})
app.get('/forgotPassword',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','forget.html'))
})
app.get('/payment',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','payment.html'));
})
app.get('/admin',isAuthenticated,(req,res)=>{
    if(req.session.userId=='Admin@123'){
    res.sendFile(path.join(__dirname,'Admin_pannel','admin.html'))
    }else{res.send('You are not allowed to view this page')}
})

app.get('/paymentAmount',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','deposit.html'))
})



// Connect to MongoDB
const db=mongoose.connect('mongodb://127.0.0.1:27017/omitrek', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
db.once
// const db = mongoose.connection;

// db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// db.once('open', () => {
//     console.log('Connected to MongoDB');
// });

app.use(bodyParser.urlencoded({ extended: true }));     // for getting form data
app.use(bodyParser.json());

// Define Mongoose Schemas
const couponSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, default:new mongoose.Types.ObjectId },
    upi: { type: String},
    amount: { type: Number },
    status: { type: String, default: 'pending' },
    date: { type: String, default: formattedDateTime(Date.now()) }
})
const withdrawlSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, default:new mongoose.Types.ObjectId },
    upi: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'Processing' },
    date: { type: String, default: formattedDateTime(Date.now()) }
});
const referralSchema= new mongoose.Schema({
    _id:String,
    date:{type:String, default: formattedDateTime(Date.now())},
    name:String,
    email:String,
    coupons:[couponSchema],
    position:String,
    level:Number
})
const userSchema = new mongoose.Schema({
    name: { type: String, require: true },
    phone: { type: Number, require: true },
    email: { type: String},
    address:String,
    state:String,
    country:String,
    userInfo:{type:String},
    password: { type: String, require: true },
    referredBy: String,
    referralCode: { type: String, require: true },
    position: String,   
    coupons: [couponSchema],
    earning:{type:Number,default:0},
    balance:{type:Number,default:0},
    referrals:[referralSchema],
    registrationDate: { type: String, default: formattedDateTime(Date.now()) },
    withdrawls: [withdrawlSchema]
});

const User = mongoose.model('User', userSchema);

// Get time in proper way
function formattedDateTime(currentDateTime) {
    // Get day, month, and year
    const day = new Date(currentDateTime).getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = new Date(currentDateTime).getMonth();
    const year = new Date(currentDateTime).getFullYear();
    // Get hours and minutes
    const hours = new Date(currentDateTime).getHours();
    const minutes = new Date(currentDateTime).getMinutes();
    // Format the date and time
    const formattedDateTime = `${day} ${monthNames[monthIndex]} ${year}, ${hours}:${minutes}`;
    return formattedDateTime;
}

//for updating whole page
app.get('/updatePage',isAuthenticated,async(req,res)=>{
    const userId = req.session.userId;
    try{
       const userData=await User.findById(userId);
       if(userData){
           const totalIncome = await updateTotalIncome(userId);
           userData.earning=totalIncome
           res.json(userData)
       }else{
          res.send(`<script>alert('Something went wrong ! Please try again')</alert>`)
       }
    }catch(err){
        console.log(err)
    }
})
//for updating sponser
app.get('/getSponser',isAuthenticated,async(req,res)=>{
    const userId=req.session.userId;
    try{
        const userReferredBy=await User.findById(userId).referredBy;
        if(userReferredBy){
            const sponserData=await User.findOne({referralCode:userReferredBy})
            res.json(sponserData);
        }else{
            res.json({name:'none',email:'none',phone:'none',country:'none',userInfo:'none'});
        }
    }
    catch(err){
        console.log(err)
    }
})

// Register Endpoint
app.post('/register', async (req, res) => {
    const isuserExist = await User.find({phone:req.body.phone})
    // console.log(req.body.phone)
    if(isuserExist.length<0){
      res.send('User already exists') 
    //   res.send(isuserExist)
    }
    else{
    try {
        const generatedReferralCode = await generateAndCheckReferralCode();

        async function generateAndCheckReferralCode() {
            while (true) {
                const generatedReferralCode = generateRandomCode();
                const existingCode = await User.findOne({ referralCode: generatedReferralCode });

                if (!existingCode) {
                    return generatedReferralCode;
                }
            }
        }

        function generateRandomCode() {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const codeLength = 12;
            let referralCode = '';
            for (let i = 0; i < codeLength; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                referralCode += characters.charAt(randomIndex);
            }
            return referralCode;
        }

        registerApplication = new User({
            referredBy:req.body.referredBy,
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email,
            password: req.body.password,
            position: req.body.position,
            referralCode: generatedReferralCode,
        });
        // userRefdata = req.body
        
        req.session.isRegistering= await true;
        req.session.phoneNo=await req.body.phone
        await sendOTP(req.body.phone)
        console.log(req.session.phoneNo)
        res.redirect('/otpForm')
    } catch (error) {
        console.error(error);           
        res.status(500).send('Internal Server Error');
    }
}
});

// Login Endpoint
app.post('/login', async (req, res) => {
    if(req.body.phone==11111111111 && req.body.password=='&@Omi&Admin23#%?'){
        req.session.isAuthenticated=true
        req.session.userId='Admin@123'
        res.redirect('/admin')
    }
    else{
    try {
        const user = await User.findOne({ phone: req.body.phone });

        if (user) {
            if (req.body.password === user.password) {
                req.session.userId = user._id;
                req.session.isAuthenticated = true;
                res.redirect('/user')
            } else {
                res.send('<script>alert("Wrong Password"); window.location.href = "/";</script>');
            }
        } else {
            res.send('<script>alert("User does not exist"); window.location.href = "/";</script>');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }}
});

//function to update referral data when user register
// async function addRefData(userData, level=1){
//     if(userData.referredBy!=="" && level<=5){
//         // while(level<=5){
//             let refByUserdata= await User.findOne({referralCode:userData.referredBy});
//             addRefD={
//                id:userData._id, 
//                date:userData.registrationDate,
//                name:userData.name,
//                email:userData.email,
//                position:userData.position,
//                level:level
//             }
//             refByUserdata.referrals.push(addRefD)
//             refByUserdata.save()
//             level++;
//             addRefData(refByUserdata);
//         // }
//     }
// }

async function addRefData(userData,userReferredBy, level = 1) {
    if (userReferredBy !== "" && level <= 5) {
        try {
            let refByUserdata = await User.findOne({ referralCode: userReferredBy });

            if (refByUserdata) {
                const addRefD = {
                    _id: userData._id,
                    date: userData.registrationDate,
                    name: userData.name,
                    email: userData.email,
                    position: userData.position,
                    level: level
                };

                refByUserdata.referrals.push(addRefD);
                await refByUserdata.save();
                const recUserRefby = refByUserdata.referredBy ;
                // Recursively call the function for the next level
                return addRefData(userData,recUserRefby,level + 1);
            } else {
                console.error("Referred user not found");
            }
        } catch (error) {
            console.error("Error updating referral data:", error);
        }
    }
}

// Withdrawal Request Endpoint
app.post('/withdrawlsReq',isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    try {
        const user = await User.findById(userId);

        if (user) {
            const reqData = req.body;
            user.withdrawls.push(reqData);
            console.log(user.withdrawls)
            await user.save();
            res.send('<script>alert("Withdrawal request submitted successfully"); window.location.href = "/";</script>');
        } else {
            res.status(404).send('<script>alert("User not found"); window.location.href = "/";</script>');
        }
    } catch (err) {
        console.error(err,req.body);
        res.status(500).send('<script>alert("Something went wrong. Please try again."); window.location.href = "/";</script>');
    }
});

// Get Withdrawal Data Endpoint
app.get('/withdrawls',isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    try {
        const dataToSend = await User.findById(userId);
        res.json(dataToSend.withdrawls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Profile Update Endpoint
app.post('/updateProfile', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const updatedProfile = req.body; // Assuming the request body contains the updated profile data

    try {
        const user = await User.findByIdAndUpdate(userId, updatedProfile, { new: true });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // user.save()
        console.log('done',user,updatedProfile)
        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Password Update Endpoint
app.post('/updatePassword', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const { oldPassword, newPassword } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the old password matches the stored password
        if (user.password !== oldPassword) {
            return res.status(401).json({ error: 'Incorrect old password' });
        }

        // Update the password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//Set password
app.post('/setPassword',isAuthenticated,async (req,res)=>{
    const userId = req.session.userId;
    try{
        const user=await User.findById(userId);
        if(!user){
            res.json(`user doesn't exist`)
        }
        user.password=req.body.password
        await user.save()
        res.redirect('/user')
    }catch(err){
        res.send(`<script>alert('Something went wrong please try again');window.location.href='/';</script>`)
    }
})

//Buy copuns
app.post('/buyCopun',isAuthenticated,async (req,res)=>{
    const userId = req.session.userId;  
    try{
        const user=await User.findById(userId);
        if(!user){
            res.status(404).send(`user doesn't exist`)

        }
        // console.log(req.body)
        user.coupons.push(req.body)
        // console.log(user)
        await user.save()
        res.redirect(`/payment?amount=${req.body.amount}`)
        const userrefBy = await User.updateMany(
            { 'referrals._id': userId },
            { $set: { 'referrals.$.coupons': req.body } }
        );
    }catch(err){
        // res.send(`<script>alert('Something went wrong please try again');</script>`)
        console.log(err)
    } 
})


async function updateTotalIncome(userId) {
    try {
        const user = await User.findById(userId);
        let totalIncome = 0;
        if (user.referrals) {
            user.referrals.forEach((users)=>{
                if(users.level==1){ totalIncome= totalIncome + users.coupons.reduce((accumulator, coupon) => accumulator + (coupon.amount || 0), 0)*10/100 || 0}
                else if(users.level==2){ totalIncome= totalIncome + users.coupons.reduce((accumulator, coupon) => accumulator + (coupon.amount || 0), 0)*5/100 || 0}
                else if(users.level==3){ totalIncome= totalIncome + users.coupons.reduce((accumulator, coupon) => accumulator + (coupon.amount || 0), 0)*3/100 || 0}
                else if(users.level==4){ totalIncome= totalIncome + users.coupons.reduce((accumulator, coupon) => accumulator + (coupon.amount || 0), 0)*2/100 || 0}
                else if(users.level==5){ totalIncome= totalIncome + users.coupons.reduce((accumulator, coupon) => accumulator + (coupon.amount || 0), 0)*1/100 || 0}
            })
        }
        return totalIncome;
    } catch (error) {
        console.error(error);
        throw error; // Re-throw the error to be caught in the calling function
    }
}


app.get('/updAdmin',isAuthenticated,async(req,res)=>{
    try {
        const users = await User.find({});
        res.json(users)
      } catch (error) {
        console.error('Error:', error);
        throw error; // Handle the error appropriately in your application
      }
})
app.post('/updStat',isAuthenticated,async(req,res)=>{
    try {
        console.log(req.body.Id)
        const user = await User.findOne({
          [req.body.findIn+'._id']:req.body.Id
        });
        console.log(user)
       // Find the index of the coupon in the array
       const cngArray=req.body.findIn;
       if(cngArray=='coupons'){
         couponIndex = user.coupons.findIndex(
        (coupon) => coupon._id.toString() === req.body.Id);
        user.coupons[couponIndex].status = req.body.stat;
    }else if(cngArray=='withdrawls'){
        couponIndex=user.withdrawls.findIndex(
            (coupon)=> coupon._id.toString() === req.body.Id
        )
        user.withdrawls[couponIndex].status = req.body.stat;
      }
  
      // Check if the coupon is found
      if (couponIndex === -1) {
        return res.status(404).json({ error: 'Coupon not found' });
      }
  
      // Update the status property of the found coupon
     
  
      // Save the updated user document
      await user.save();
  
      res.status(200).json({ message: 'Coupon status updated successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.listen(port, () => {
    console.log(`The application started successfully on port ${port}`);
});



app.post('/verifyOtp',async(req,res)=>{
    console.log('hui bui otp',req.body.otp,req.session.isRegistering)
    const verify =await verifyOTP(req.session.phoneNo,req.body.otp)
    if(verify){
        if(req.session.isRegistering){
            await registerApplication.save();
            req.session.userId = registerApplication._id;
            req.session.isAuthenticated=true;
            res.redirect('/user');
            const userRefBy = registerApplication.referredBy  ;
            addRefData(registerApplication,userRefBy);
            req.session.isRegistering=false;
        }else{
            try {
                const user = await User.findOne({ phone: req.body.phone });
        
                if (user) {
                        req.session.userId = user._id;
                        req.session.isAuthenticated = true;
                        res.redirect('/user')
                } else {
                    res.send('<script>alert("User does not exist"); window.location.href = "/";</script>');
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        }
    }
})
app.post('/forgotPass',async(req,res)=>{
    try{
        await sendOTP(req.body.phone)
        req.session.phoneNo=req.body.phone
        res.redirect('/otpForm')
    }catch(err){console.log(err);res.send('something went wrong try again')}
})
const fast2sms = require('fast-two-sms');

// In-memory cache for storing OTPs and timestamps
const otpCache = {};

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

function sendOTP(phoneNumber) {
    const otp = generateOTP();
    const options = {
        authorization: 'Go6NclO5uh3gfTeHr8YyxFzbBQnPWj70CtRksX4EUvM2V1awIDjUzZnTku37dMaP4CAtGvB8yYglx6qc',
        message:otp,
        numbers: [phoneNumber]
    };
    console.log(otp)
    // sessionNo=phoneNumber;
    // sessionNo=phoneNumber;
    // Store OTP in cache with timestamp
    otpCache[phoneNumber] = {
        otp: otp,
        timestamp: Date.now()
    };
    console.log(otpCache[phoneNumber])
    // window.open('/otpform')
    // Send SMS
    return fast2sms.sendMessage(options)
        .then(res => {
            console.log('OTP sent successfully:', res);
            return otp; // Return the generated OTP for verification
        })
        .catch(err => {
            console.error('Error sending OTP:', err);
            throw err;
        });
}

function verifyOTP(phoneNumber, userEnteredOTP) {
    // Check if OTP exists in the cache
    const cachedOTP = otpCache[phoneNumber];
    console.log(cachedOTP)
    if (cachedOTP && cachedOTP.otp == userEnteredOTP) {
        // Check if the OTP is still valid (within a 1-minute window)
        const currentTime = Date.now();
        const timeDifference = currentTime - cachedOTP.timestamp;
        console.log('hui buibui')
        if (timeDifference <= 60000) {
            // OTP is valid
            console.log('OTP verified successfully!');
            // Optionally, you can remove the OTP from the cache to prevent reuse
            delete otpCache[phoneNumber];
            return true;
        } else {
            // OTP has expired
            console.log('OTP has expired.');
            delete otpCache[phoneNumber]; // Remove expired OTP from the cache
            return false;
        }
    } else {
        // OTP not found or does not match
        console.log('Invalid OTP.');
        return false;
    }
}

// Example usage:
// const phoneNumber = '1234567890'; // Replace with the desired phone number
// sendOTP(phoneNumber)
//     .then(otp => {
//         console.log('Generated OTP:', otp);

//         // Simulate OTP verification after a delay (e.g., user entering OTP after receiving SMS)
//         setTimeout(() => {
//             const userEnteredOTP = '123456'; // Replace with the actual OTP entered by the user
//             verifyOTP(phoneNumber, userEnteredOTP);
//         }, 5000); // Simulating a delay of 5 seconds before verifying OTP
//     })
//     .catch(err => {
//         console.error('Error:', err);
//     });

// const updk={
//     upi:'289139@ybl',
//     amount:1000
// }
// const userrefBy = await User.updateMany(
//     { 'referrals._id': userId },
//     { $set: { 'referrals.$.coupons':updk } }
// );
