import express from 'express';
import cors from 'cors';
import { scrape_price } from './app.js';
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from './config.js';
import Axios from 'axios';
import { initializeApp } from "firebase-admin/app";
import pkg from 'firebase-admin';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const credentials = require("./serviceAccount.json");
const { credential } = pkg;


const { auth } = pkg;
const app = express();




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


app.get('/', (_req, res) => {
    res.send("Server is working")
})





// ******************SIGN UP***********************************


async function checkUserInFirebase(email) {
    return new Promise((resolve,_reject) => {
        auth().getUserByEmail(email)
            .then(() => {
                resolve(true);
            })
            .catch(() => {
                resolve(false);
            });
    });
}

app.get('/signup', async(req, res) => {
    let check = false;
    let email = req.query.email;
    let password = req.query.password;
    check = await checkUserInFirebase(email);
    if(!check)
    {

        auth().createUser
        (
            {
                email: email,
                password: password,
            }
        )
        .then(function () {
            res.send({message:"user added"});
            res.status(201).end();
        })

    }
    else{
        res.end({message:"User Already existed"})
    }
})


// ***************** LOGIN******************************


app.get('/login',(req,res)=>{
    const auths = getAuth();
    signInWithEmailAndPassword(auths, req.query.email, req.query.password)
      .then((userCredential) => {
        // Signed in 
        const _user = userCredential.user;
        res.send({message:"User logged in"});
        res.end();
      })
      .catch((_error) => {
        res.end("User does not exist");
      });
})







// ***************ADD USER ON FIRESTORE************************************


app.get('/adduser', async (req, res) => {
    try {
        const user = await doc(db, "users", req.query.id);
        setDoc(user, {
            name: req.query.name,
            mobile: req.query.id,
            stock: [{
                s_name: req.query.stockname,
                qty: req.query.qty,
                invested: req.query.invested
            }],

        }, { merge: true });
        res.end();
    } catch (e) {
        console.error("Error adding document: ", e);
    }

})



// *********** ADDING USER IN FIRESTORE*************************************



app.get('/user', async (req, res) => {
    const user = doc(db, "users", req.query.id);
    let number;
    let flag1 = 0;
    let flag2 = 0;
    let arr = [];
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((docs) => {
        if (docs.id == req.query.id) {
            flag2 = 1;
            for (const element of docs.data().stock) {
                if (element.s_name == req.query.stockname) {
                    number = parseInt(element.qty);
                    arr.push({
                        s_name: element.s_name,
                        invested: parseInt(element.invested) + parseInt(req.query.invested),
                        qty: number + parseInt(req.query.qty)
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
                    s_name: req.query.stockname,
                    qty: req.query.qty,
                    invested: req.query.invested
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
            name: req.query.name,
            mobile: req.query.id,
            stock: [{
                s_name: req.query.stockname,
                qty: parseInt(req.query.qty),
                invested: parseInt(req.query.invested)
            }],
        }, { merge: true });
    }
    res.end();
})

// ********************** GET STATUS *************************


app.get('/getstatus', async (req, res) => {
    let difference = 0;
    let total = 0;
    let inddif=[];
    const docref = doc(db, "users", req.query.id);
    const docSnap = await getDoc(docref);
    try{
    if (docSnap.exists()) {
        let stocksarr = docSnap.data().stock;
        // console.log("Before for loop")
        const promises = stocksarr.map(async (stockarr) => {
            let value = await callfordata(stockarr.s_name);
            let subs = parseInt(value['data']['Global Quote']['05. price']);
            difference = (parseInt(stockarr.invested) - subs * 79 * parseInt(stockarr.qty))
            let obj = {"name":stockarr.s_name,"diff":difference};
            inddif.push(obj);
            total += difference;
        })
        await Promise.all(promises);
        res.status(200).send({"P&L":total.toString(),"stocksdetail":stocksarr, "inddif":inddif});
    }
    else {
        res.end("No such document");
    }
}
catch(err){
res.send("Error occured:"+err);
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


//********************* POST JUST FOR CHECKING ***********************

app.post('/postdata', function (req, res) {/* TODO document why this function is empty */
    console.log(req.body);
    res.status(201).send("Data is recieved...")
});


app.listen(3000, (err) => {
    if (!err) {
        console.log("Server started at port 3000");
    }
});