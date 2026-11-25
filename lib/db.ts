import { MongoClient } from "mongodb";
declare global { var _royalMongoPromise: Promise<MongoClient> | undefined; }
export async function getDb(){
 const uri=process.env.MONGODB_URI;if(!uri)throw new Error("MONGODB_URI is not configured");
 if(!global._royalMongoPromise)global._royalMongoPromise=new MongoClient(uri).connect();
 const client=await global._royalMongoPromise;return client.db(process.env.MONGODB_DB||"royal_menu");
}