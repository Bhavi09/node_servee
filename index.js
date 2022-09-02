import express from 'express';
import cors from 'cors';
import { scrape_price } from './app.js';
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from './config.js';
import Axios from 'axios';
import { initializeApp } from "firebase-admin/app";
import pkg from 'firebase-admin';
import { getAuth, signInWithEmailAndPassword, signInWithEmailLink, signOut } from "firebase/auth";
import { createRequire } from "module";




const require = createRequire(import.meta.url);
const credentials = require("./serviceAccount.json");
const { credential } = pkg;
const { auth } = pkg;
const app = express();

let actoken;





initializeApp({
    credential: credential.cert(credentials)
});

// Use of cors 
app.use(cors({
    origin: 'http://localhost:4200'
}))

app.use(express.json());


app.use(express.urlencoded({ extended: true }));


let pfo;
// **********API'S***********************************************


app.get('/', (_req, res) => {
    res.send("Server is working")
})

// ******************SIGN UP***********************************

async function checkUserInFirebase(email) {
    return new Promise((resolve, _reject) => {
        auth().getUserByEmail(email)
            .then(() => {
                resolve(true);
            })
            .catch(() => {
                resolve(false);
            });
    });
}

app.get('/signup', async (req, res) => {
    let check = false;
    let email = req.query.email;
    let password = req.query.password;
    check = await checkUserInFirebase(email);
    if (!check) {

        auth().createUser
            (
                {
                    email: email,
                    password: password,
                }
            )
            .then(function () {
                res.send({ message: "user added" });
                res.status(201).end();
            })

    }
    else {
        res.send({ message: "User Already existed" })
    }
})


// ***************** LOGIN**********************************************


app.get('/login', (req, res) => {
    const auths = getAuth();
    signInWithEmailAndPassword(auths, req.query.email, req.query.password)
        .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;
            // console.log(user["accessToken"]);
            actoken = user["accessToken"];
            res.send({ message: "User logged in",accessToken:user["accessToken"] });
        })
        .catch((_error) => {
            res.send({ message: "User does not exist" });
        });
})

// ***************** SIGNOUT **********************************************


// ***************ADD USER ON FIRESTORE************************************


app.get('/checking', async (req, res) => {
    const auths = getAuth();
    auth().verifyIdToken(req.query.actoken).then((decodedtoken)=>{
        if(auths.currentUser.uid==decodedtoken.uid)
        {
            console.log("user is verified");
            res.send("User is verified");

        }
        else
        {
            console.log("Error")
            res.send("Error");
}
    })
    // try {
    //     const user = doc(db, "users", req.query.id);
    //     setDoc(user, {
    //         name: req.query.name,
    //         mobile: req.query.id,
    //         stock: [{
    //             s_name: req.query.stockname,
    //             qty: req.query.qty,
    //             invested: req.query.invested
    //         }],

    //     }, { merge: true });
    //     res.end();
    // } catch (e) {
    //     console.error("Error adding document: ", e);
    // }

})


// *********** ADDING USER BUYING IN FIRESTORE*************************************



app.post('/user', async (req, res) => {
    try {
        const user = doc(db, "users", req.body.id);
        let number;
        let flag1 = 0;
        let flag2 = 0;
        let arr = [];
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach((docs) => {
            if (docs.id == req.body.id) {
                flag2 = 1;
                for (const element of docs.data().stock) {
                    if (element.s_name == req.body.stockname) {
                        number = parseInt(element.qty);
                        arr.push({
                            s_name: element.s_name,
                            invested: parseInt(element.invested) + parseInt(req.body.invested),
                            qty: number + parseInt(req.body.qty)
                        })
                        flag1 = 1;
                    }
                    else {
                        arr.push({
                            s_name: element.s_name,
                            invested: element.invested,
                            qty: element.qty
                        })
                    }
                }
                if (flag1 == 0) {
                    arr.push({
                        s_name: req.body.stockname,
                        qty: req.body.qty,
                        invested: req.body.invested
                    })
                }
                console.log(arr);
                updateDoc(user, {
                    "stock": arr
                }, { merge: true });
            }
        });
        if (flag2 != 1) {
            setDoc(user, {
                contact_detail: req.body.id,
                stock: [{
                    s_name: req.body.stockname,
                    qty: parseInt(req.body.qty),
                    invested: parseInt(req.body.invested)
                }],
            }, { merge: true });
        }
        res.send({ inres: "successfully updated" });
    } catch (error) { res.send(err); }
});

// ********************** GET STATUS *************************


app.get('/getstatus', async (req, res) => {
    let difference = 0;
    let total = 0;
    let inddif = [];
    const docref = doc(db, "users", req.query.id);
    const docSnap = await getDoc(docref);
    try {
        if (docSnap.exists()) {
            let stocksarr = docSnap.data().stock;
            // console.log("Before for loop")
            const promises = stocksarr.map(async (stockarr) => {
                let value = await callfordata(stockarr.s_name);
                let subs = parseInt(value['data']['Global Quote']['05. price']);
                difference = (subs * 79 * parseInt(stockarr.qty) - parseInt(stockarr.invested))
                let obj = { "name": stockarr.s_name, "diff": difference };
                inddif.push(obj);
                total += difference;
            })
            await Promise.all(promises);
            res.status(200).send({ "P&L": total.toString(), "stocksdetail": stocksarr, "inddif": inddif });
        }
        else {
            res.end("No such document");
        }
    }
    catch (err) {
        console.log("Error occured: " + err);
        res.send("Error occured:" + err);
    }
})



async function callfordata(name) {
    return new Promise((resolve, _reject) => {
        Axios.get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${name}&apikey=TM0KKBA3TUNIU9US`)
            .then(response => {
                resolve(response);
            })
            .catch(error => { reject(error) })
    }
    );
}


// ************** SELL STOCK***************************************
app.post('/sell', async (req, res) => {
    let flag1 = 0;
    const docref = doc(db, "users", req.body.id);
    const docSnap = await getDoc(docref);
    let stockarr = docSnap.data().stock;
    let stockarr2 = [];
    let pl = 0;
    for (let i = 0; i < stockarr.length; i++) {
        let temp = stockarr[i];
        if ((req.body.name == temp["s_name"]) && (parseInt(req.body.qty) <= parseInt(temp["qty"]))) {
            flag1 = 1;
            let value = await callfordata(temp["s_name"]);
            let subs = 79 * parseInt(value['data']['Global Quote']['05. price']) * parseInt(req.body.qty);
            pl = ((79 * parseInt(value['data']['Global Quote']['05. price'])) - (parseInt(temp["invested"]) / parseInt(temp["qty"])));
            let stock;
            if ((temp["qty"] - req.body.qty) != 0) {
                 stock = {
                    invested: temp["invested"] - subs,
                    qty: temp["qty"] - req.body.qty,
                    s_name: temp['s_name']
                }
                stockarr2.push(stock);
            }
        }
        else stockarr2.push(temp);
    }

    if (flag1 == 0) {
        res.send({ pl: "Please enter correct name or qty" });
    }
    else {
        updateDoc(docref, {
            "stock": stockarr2
        }, { merge: true });
        res.send({ pl: pl * parseInt(req.body.qty) });
    }
})

// ************DELETE USER*******************************************

app.get('/deleteuser', async (req, res) => {

    await deleteDoc(doc(db, "users", req.query.documentid));
    res.end("Document is deleted....")
})



// ************** ADD USER AND UPDATE USER ***************************

app.get('/adduserby', async (_req, res) => {
    await setDoc(doc(db, "users", "9414473826"), { Name: "Bhavi Mehta Udaipur" });
    res.end("User is added...");
})


app.get('/updateuser', async (_req, res) => {
    await setDoc(doc(db, "users", "9414473826"), { Name: "Bhavi Mehta" });
    res.end();
})


//***************price function imported from app.js************************

scrape_price("https://www.tickertape.in/stocks/state-bank-of-india-SBI?checklist=basic").then((response) => {
    pfo = response;
    app.get('/price', (_req, res) => {
        const responseData = {
            sbi_price: `${response}`
        };
        const jsonContent = JSON.stringify(responseData);
        res.end(jsonContent);
    })
})



app.listen(3000, (err) => {
    if (!err) {
        console.log("Server started at port 3000");
    }
});