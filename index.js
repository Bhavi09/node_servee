import express from 'express';
import cors from 'cors';
import { scrape_price } from './app.js';
import { collection,getDocs,deleteDoc,doc,setDoc,updateDoc } from "firebase/firestore";
import { db } from './config.js'; 
import  Axios  from 'axios';
const app = express();

// Use of cors 
app.use(cors({
    origin:'http://localhost:4200'
}))

app.use(express.json());


app.use(express.urlencoded({extended:false}));

let pfo;
//***************price function imported from app.js************************




scrape_price("https://www.tickertape.in/stocks/state-bank-of-india-SBI?checklist=basic").then((response)=>{
pfo = response;    
app.get('/price',(_req,res)=>{
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
        const user = await doc(db,"users",req.query.id);
        setDoc(user,{
          name: req.query.name,
          mobile:req.query.id,
          stock:[{
            s_name:req.query.stockname,
            qty:req.query.qty,
            invested:req.query.invested
          }],
          
        },{merge:true});
        res.end();
      } catch (e) {
        console.error("Error adding document: ", e);
      }
      
})



// *********** ADDING USER IN FIRESTORE*************************************



app.get('/user', async(req,res)=>{
    const user = doc(db, "users", req.query.id);
    let number;
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((docs) => {
        if(docs.id == req.query.id)
        {
            let arr = [];
            let flag = 0;
            for(const element of docs.data().stock)
            {    
            if(element.s_name == req.query.stockname)
            { 
                number = parseInt(element.qty);
                arr.push({
                    s_name: element.s_name,
                    invested: parseInt(element.invested)+parseInt(req.query.invested),
                    qty: number+parseInt(req.query.qty)
                })
                flag=1;
            }
            else{
                arr.push({s_name: element.s_name,
                    invested: element.invested,
                    qty: element.qty
                })
            }
            }
            if(flag==0)
            {
                arr.push({s_name:req.query.stockname,
                    qty:req.query.qty,
                    invested:req.query.invested})
            }
            updateDoc(user, {
                "stock": arr
           });
        }
        else{
        setDoc(user,{
          name: req.query.name,
          mobile:req.query.id,
          stock:[{
            s_name:req.query.stockname,
            qty:req.query.qty,
            invested:req.query.invested
          }],
        },{merge:true});
        }
    });
    res.end();
})




// ************DELETE USER*******************************************

app.get('/deleteuser', async(req,res)=>{

    await deleteDoc(doc(db, "users", req.query.documentid));
    res.end("Document is deleted....")
})

// ************** ADD USER AND UPDATE USER ***************************

app.get('/adduserby', async(_req,res)=>{
    await setDoc(doc(db,"users","9414473826"),{Name:"Bhavi Mehta UDaipur"});
      res.end("User is added...");
})


app.get('/updateuser',async(_req,res)=>{
    await setDoc(doc(db,"users","9414473826"),{Name:"Bhavi Mehta"});
    res.end();
})



app.get('/getprice',(req,res)=>{
callfordata(req.query.name);
res.end();
})

function callfordata(name)
{
    Axios.get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${name}&apikey=TM0KKBA3TUNIU9US`)
    .then(response=>{
        console.log(response);
    })
    .catch(error=>{console.log(error)});
}


app.post('/postdata',function(req,res){/* TODO document why this function is empty */ 
console.log(req.body);
res.status(201).send("Data is recieved...")
});


app.listen(3000,(err)=>{
    if(!err)
    {
        console.log("Server started at port 3000");
    }
});