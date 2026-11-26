import {MongoClient} from "mongodb";
declare global {
 var _royalMongoPromise:Promise<MongoClient>|undefined;
 var _royalIndexesPromise:Promise<void>|undefined;
}
export async function getDb(){
 const uri=process.env.MONGODB_URI;
 if(!uri)throw new Error("MONGODB_URI is not configured");
 if(!global._royalMongoPromise)global._royalMongoPromise=new MongoClient(uri,{retryWrites:true,writeConcern:{w:"majority",j:true}}).connect();
 const client=await global._royalMongoPromise;
 const db=client.db(process.env.MONGODB_DB||"royal_menu");
 if(!global._royalIndexesPromise)global._royalIndexesPromise=Promise.all([
  db.collection("products").createIndex({tenantId:1,active:1,sortOrder:1,createdAt:-1}),
  db.collection("orders").createIndex({tenantId:1,createdAt:-1}),
  db.collection("orders").createIndex({orderNumber:1},{unique:true}),
  db.collection("orders").createIndex({requestId:1},{unique:true,sparse:true}),
  db.collection("categories").createIndex({tenantId:1,active:1,sortOrder:1,name:1}),
  db.collection("tenants").createIndex({adminUsername:1},{unique:true,partialFilterExpression:{adminUsername:{$type:"string"}}}),\n  db.collection("adminLoginAttempts").createIndex({expireAt:1},{expireAfterSeconds:0}),\n  db.collection("platformLoginAttempts").createIndex({expireAt:1},{expireAfterSeconds:0})
 ]).then(()=>undefined);
 await global._royalIndexesPromise;
 return db;
}
