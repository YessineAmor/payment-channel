import React, { Component, useEffect, useState } from 'react';
// import SimpleStorageContract from "./contracts/SimpleStorage.json";
import PaymentChannel from './contracts/PaymentChannel.json';
import getWeb3 from './getWeb3';

import './App.css';

const App = () => {
  const [blockchainInfo, setBlockchainInfo] = useState({});
  const [messageHash, setMessageHash] = useState(null);
  const [amountToSend, setAmountToSend] = useState({ toBob: 0, toAlice: 0 });
  const [signatures, setSignatures] = useState({ alice: null, bob: null });
  const [aliceAccount, setAliceAccount] = useState('');
  const [bobAccount, setBobAccount] = useState('');
  const [transaction, setTransaction] = useState({
    amount: 0,
    toBob: 0,
    toAlice: 0,
  });

  const promptAliceSignature = async () => {
    if ((await blockchainInfo.web3.eth.getAccounts()) != aliceAccount) {
      alert('Please sign this with ' + aliceAccount);
      return;
    }

    const aliceSignature = await blockchainInfo.web3.eth.personal.sign(
      messageHash,
      aliceAccount.toString('hex'),
      ''
    );
    setSignatures({ ...signatures, alice: aliceSignature });
  };

  const promptBobSignature = async () => {
    if ((await blockchainInfo.web3.eth.getAccounts()) != bobAccount) {
      alert('Please sign this with ' + bobAccount);
      return;
    }
    const bobSignature = await blockchainInfo.web3.eth.personal.sign(
      messageHash,
      bobAccount.toString('hex'),
      ''
    );
    setSignatures({ ...signatures, bob: bobSignature });
  };

  const setupWeb3 = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      web3.eth.defaultAccount = accounts[0];
      var paymentChannelContract = new web3.eth.Contract(
        PaymentChannel.abi,
        '0xD9769988DED363ad8D382b4835bD8E3564aF6ED2'
      );

      setBlockchainInfo({ accounts, web3, paymentChannelContract });
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      // this.setState({ web3, accounts, contract: instance }, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };
  useEffect(() => {
    setupWeb3();
  }, []);

  const inputChanged = (e) => {
    setAmountToSend({
      ...amountToSend,
      [e.target.name]: parseFloat(e.target.value),
    });
  };
  const handleSend = (e) => {
    setTransaction({
      ...transaction,
      [e.target.name]: amountToSend[e.target.name] + transaction[e.target.name],
    });
  };

  const handleViewFinalTransaction = () => {
    transaction.toAlice > transaction.toBob
      ? setTransaction({ toAlice: transaction.toAlice - transaction.toBob })
      : setTransaction({ toBob: transaction.toBob - transaction.toAlice });
  };

  const handleSubmitTransaction = async () => {
    let from, fromSignature, toSignature, amount;
    let to;
    if (transaction.toAlice) {
      amount = transaction.toAlice;
      from = bobAccount;
      to = aliceAccount;
      fromSignature = signatures['bob'];
      toSignature = signatures['alice'];
    } else {
      amount = transaction.toBob;
      from = aliceAccount;
      to = bobAccount;
      fromSignature = signatures['alice'];
      toSignature = signatures['bob'];
    }
    if ((await blockchainInfo.web3.eth.getAccounts()) != to) {
      alert('Only recipient ' + to + ' can submit to the blockchain');
      return;
    }
    await blockchainInfo.paymentChannelContract.methods
      .updateBalances(from, to, amount, 0, fromSignature, toSignature)
      .send({ from: to, value: amount, gas: 10000000 })
      .then((result) => {
        console.log('Sent successfully! ' + JSON.stringify(result));
        alert('Sent successfully!');
      })
      .catch((err) => console.log('error in sending' + err));
  };
  const handleFinalizeTransaction = async () => {
    let from, to, amount;
    if (transaction.toAlice) {
      amount = transaction.toAlice;
      from = bobAccount;
      to = aliceAccount;
    } else {
      amount = transaction.toBob;
      from = aliceAccount;
      to = bobAccount;
    }
    const messageHash = blockchainInfo.web3.utils.soliditySha3(
      {
        type: 'address',
        v: from.toString('hex'),
      },
      {
        type: 'address',
        v: to.toString('hex'),
      },
      {
        type: 'uint256',
        v: amount,
      },
      {
        type: 'uint256',
        v: 0,
      }
    );
    setMessageHash(messageHash);
  };

  if (!blockchainInfo.web3) {
    return <div>Loading Web3, accounts, and contract...</div>;
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="App"
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Alice</h2>
          <h5>
            Please input Alice account
            <input
              type="text"
              value={aliceAccount}
              onChange={(e) => setAliceAccount(e.target.value)}
            ></input>
          </h5>
          <p>
            Send{' '}
            <input
              name="toBob"
              defaultValue="0"
              onChange={(e) => inputChanged(e)}
            />{' '}
            Ether to Bob{' '}
          </p>
          <button name="toBob" onClick={handleSend}>
            Send
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Bob</h2>
          <h5>
            Please input Bob account
            <input
              type="text"
              value={bobAccount}
              onChange={(e) => setBobAccount(e.target.value)}
            ></input>
          </h5>
          <p>
            Send{' '}
            <input
              name="toAlice"
              defaultValue="0"
              onChange={(e) => inputChanged(e)}
              value={amountToSend['toAlice']}
            />{' '}
            Ether to Alice{' '}
          </p>
          <button name="toAlice" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
      <h2>Current transaction: {JSON.stringify(transaction)}</h2>
      <button onClick={handleViewFinalTransaction}>
        View final transaction
      </button>
      <br></br>
      <button onClick={handleFinalizeTransaction}>
        Finalize transaction.
      </button>{' '}
      {messageHash ? (
        <p>
          Message hash generated: {JSON.stringify(messageHash)}{' '}
          <p>
            <button onClick={promptAliceSignature}>
              Sign with alice account
            </button>
          </p>{' '}
          <p>
            <button onClick={promptBobSignature}>Sign with Bob account</button>
          </p>
        </p>
      ) : null}
      <p>
        <button onClick={handleSubmitTransaction}>Submit to blockain.</button>
      </p>
    </div>
  );
};

export default App;
