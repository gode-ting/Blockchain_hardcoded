var port = process.env.port || 3001;

var sha256 = require("sha256")
var bodyParser = require('body-parser')
const express = require('express')
const app = express()
app.use(bodyParser.json())

class Blockchain{
    constructor(){
        this.chain = [{
            'index': 0,
            'timestamp': new Date().toLocaleString,
            'transactions': "empty",
            'proof': "proof",
            'previous_hash': "Genesis"
        }]
        this.current_transactions = []
    }

    new_block(proof, previous_hash) {
        var block = {
            'index': this.chain.length+1,
            'timestamp': new Date().toLocaleString(),
            'transactions': JSON.stringify(this.current_transactions),
            'proof': proof,
            'previous_hash': previous_hash
        }
        this.current_transactions = []
        this.chain.push(block)

        return block
    }

    new_transaction(sender,recipient,amount){
        this.current_transactions.push({
            sender,
            recipient,
            amount
        })
    }

    last_block(){
        return this.chain[this.chain.length-1]
    }

    proof_of_work(){
        var proof = 0
        while(!this.valid_proof(this.chain[this.chain.length-1].proof,proof)){
            proof += 1
        }

        return proof
    }

    valid_proof(last_proof, proof){
        var guess = "" + last_proof + proof
        var hashed_guess = sha256(guess)
        return hashed_guess.substr(hashed_guess.length - 1) === "0"
    }

}

var myBC = new Blockchain()
myBC.new_transaction("Freps","hiller",5)
myBC.new_transaction("Freps","hiller",10)
myBC.new_transaction("Freps","hiller",15)
console.log(myBC.current_transactions)

// console.log("---------------------")

// myBC.new_block(1)
// myBC.new_block(2)
// myBC.new_block(3)
// console.log(myBC.chain)

// console.log("---------------------")

// var proof = myBC.proof_of_work()
// myBC.new_block(proof)
// var proof = myBC.proof_of_work()
// myBC.new_block(proof)
// var proof = myBC.proof_of_work()
// myBC.new_block(proof)

console.log("---------------------")

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/transactions/new', function (req, res) {
    myBC.new_transaction(req.body.sender,req.body.recipient,req.body.amount)
    console.log(myBC.current_transactions)
    res.send("transaction added!")
})

app.get('/mine', function (req, res) {
    var last_block = myBC.last_block()
    var last_proof = last_block.proof
    var proof = myBC.proof_of_work(last_proof)
    var previous_hash = sha256(JSON.stringify(last_block))

    myBC.new_transaction("Mine reward", "Unknown worker", 1)

    myBC.new_block(proof,previous_hash)

    res.send('Block added!')
    console.log("-------------------")
    console.log(myBC.chain)
})

app.listen(port, () => console.log('Example app listening on port 3000!'))
