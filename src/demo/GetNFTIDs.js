import React, { useState, useEffect } from "react"
import * as fcl from "@onflow/fcl"

import Card from '../components/Card'
import Header from '../components/Header'
import Code from '../components/Code'
import ownerAddress from '../owner'
const scriptGetIDs = (address) => `\
import MyNFTContract from ${ownerAddress}

pub fun main() : [UInt64] {
  let nftOwner = getAccount(${address})
  // log("NFT Owner")
  let capability = nftOwner.getCapability<&{MyNFTContract.NFTReceiver}>(MyNFTContract.CollectionPublicPath)
  
  let receiverRef = capability.borrow()
  ?? panic("Could not borrow the receiver reference")
  
  return receiverRef.getIDs()
  }
`

export default function GetNFTIDs() {
  const [data, setData] = useState(null)
  const [user, setUser] = useState({})

  useEffect(() =>
    fcl
      .currentUser()
      .subscribe(user => setUser({ ...user }))
    , [])
  const NFTOwnerAddress = user.addr;

  const runScript = async (event) => {
    event.preventDefault()
    //alert(ownerAddress);
    if(user.addr === null){
      alert("Please sign in.");
      return;
    }
    try{
      const response = await fcl.send([
        fcl.script(scriptGetIDs(NFTOwnerAddress)),
      ])
      
      await setData(await fcl.decode(response))
      
    }catch(error){
      console.log(error);
      alert("Please set your NFT accout. \n In Flow network, User have to set NFT account that stores NFTs in user's account.");
    }
    
  }
  
  return (
    <Card>
      <Header>Get NFT Ids from account of current user</Header>
      
      {/* <Code>{scriptGetIDs(NFTOwnerAddress)}</Code> */}
      
      <button onClick={runScript}>get NFT IDs</button>

      {data && (
        <Code>
          {JSON.stringify(data, null, 2)}
        </Code>
      )}
    </Card>
  )
}
