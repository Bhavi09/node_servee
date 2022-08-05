import express from 'express';
import cors from 'cors';
import { scrape_price } from './app.js';
import { collection, addDoc, getDocs,deleteDoc,doc } from "firebase/firestore";
import { db } from './config.js'; 
const app = express();

// Use of cors 
app.use(cors({
    origin:'http://localhost:4200'
}))

var pfo;
// sbi_price function imported from app.js
scrape_price("https://www.tickertape.in/stocks/state-bank-of-india-SBI?checklist=basic").then((response)=>{
pfo = response;    
app.get('/price',(req,res)=>{
        const responseData = {
            sbi_price:`${response}`
          };
        const jsonContent = JSON.stringify(responseData);
        res.end(jsonContent);
    })
})




// ***************ADD USER ON FIRESTORE************************************
app.get('/adduser',async (req,res)=>{
    try {
        const docRef = await addDoc(collection(db, "users"), {
          first: req.query.name,
          last: req.query.surname,
          Invested: req.query.qty*pfo
        });
        console.log("Document written with ID: ", docRef.id);
        res.end();
      } catch (e) {
        console.error("Error adding document: ", e);
      }
      
})



// *********** GET USER FROM FIRESTORE*************************************
app.get('/getuser', async(req,res)=>{
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((doc) => {
    console.log(`${doc.id} => ${doc.data()}`);
    });
    res.end();
})




// ************DELETE USER*******************************************
app.get('/deleteuser', async(req,res)=>{

    await deleteDoc(doc(db, "users", req.query.documentid));
    res.end("Document is deleted....")
})


// app.get('/adduserby', async(req,res)=>{
//     await addDoc(doc(db,"user"),{Name:"Bhavi Mehta UDaipur"});
//       res.end("Wooah!!! User is added...");
// })


app.listen(3000,(err)=>{
    if(!err)
    {
        console.log("Server started at port 3000");
    }
});