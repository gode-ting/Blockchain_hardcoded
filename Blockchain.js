var port = process.env.port || 3001;

var sha256 = require("sha256")
var bodyParser = require('body-parser')
const express = require('express')
const app = express()
const request = require('request');

app.use(bodyParser.json())

class Blockchain {
    constructor() {
        this.chain = [{
            'index': 0,
            'timestamp': new Date().toLocaleString,
            'transactions': "empty",
            'proof': "proof",
            'previous_hash': "Genesis"
        }]
        this.current_transactions = []
        this.nodes = []

    }

    new_block(proof, previous_hash) {
        var block = {
            'index': this.chain.length + 1,
            'timestamp': new Date().toLocaleString(),
            'transactions': JSON.stringify(this.current_transactions),
            'proof': proof,
            'previous_hash': previous_hash
        }
        this.current_transactions = []
        this.chain.push(block)

        return block
    }

    new_transaction(sender, recipient, amount) {
        this.current_transactions.push({
            sender,
            recipient,
            amount
        })
    }

    last_block() {
        return this.chain[this.chain.length - 1]
    }

    proof_of_work() {
        var proof = 0
        while (!this.valid_proof(this.chain[this.chain.length - 1].proof, proof)) {
            proof += 1
        }

        return proof
    }

    valid_proof(last_proof, proof) {
        var guess = "" + last_proof + proof
        var hashed_guess = sha256(guess)
        return hashed_guess.substr(hashed_guess.length - 1) === "0"
    }

    register_node(address) {
        this.nodes.push(address)
    }

    valid_chain(chain) {
        var last_block = chain[0]
        console.log("-----------------")
        console.log("chain: " + JSON.stringify(chain))
        console.log("lb: " + JSON.stringify(last_block))
        var current_index = 1

        while (current_index < chain.length) {

            var block = chain[current_index]
            console.log("index: " + current_index)
            console.log("block: " +  JSON.stringify(block))
            console.log("last block hash: " + this.hash_block(last_block))
            console.log("this block previous hash: " + block.previous_hash)
            console.log("1 " + block.previous_hash)
            console.log("2 " + this.hash_block(last_block))
            if (block.previous_hash != this.hash_block(last_block)) {
                return false
            }

            if (!this.valid_proof(last_block.proof, block.proof)) {
                return false
            }
            last_block = block
            current_index += 1
            console.log("test")
        }
        return true
    }

    resolve_conflicts() {
        var max_length = this.chain.length
        var myBlockChain = this
        var changed = false
        this.nodes.forEach(function(element){
            
            request(element+"/chain", function (error, response, body) {
                console.log("ele: " + element)
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                //console.log('body:', body); // Print the HTML for the Google homepage.

                if(response.statusCode == 200){
                    var blockchain = JSON.parse(response.body)
                    var length = blockchain.length
                    console.log("length_ " + length)
                    var chain = blockchain.chain

                    console.log("res: " + response.body)

                    console.log("this chain: " + myBlockChain.chain)
                    console.log("that chain: " + chain)

                    var y = myBlockChain.valid_chain(chain)
                    console.log("hallo: " + y)

                    if(length > max_length && myBlockChain.valid_chain(chain)){
                        max_length = length
                        var new_chain = chain
                        changed = true
                        console.log("am i here?")
                    }
                }
            })
            
            console.log("testing")
        })

        console.log("what are you? " + changed)
        if (changed) {
            console.log("am i ehere2?")
            this.chain = new_chain
            return true
        }
        return false
    }

    hash_block(block) {
        return sha256(JSON.stringify(block))
    }
}

var myBC = new Blockchain()

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/transactions/new', function (req, res) {
    myBC.new_transaction(req.body.sender, req.body.recipient, req.body.amount)
    console.log(myBC.current_transactions)
    res.send("transaction added!")
})

app.get('/mine', function (req, res) {
    var last_block = myBC.last_block()
    var last_proof = last_block.proof
    var proof = myBC.proof_of_work(last_proof)
    var previous_hash = myBC.hash_block(last_block)

    myBC.new_transaction("Mine reward", "Unknown worker", 1)

    myBC.new_block(proof, previous_hash)

    res.send('Block added!')
    console.log("-------------------")
    console.log(myBC.chain)
})

app.get('/chain', function (req, res) {
    response = {
        'chain': myBC.chain,
        'length': myBC.chain.length
    }
    res.send(JSON.stringify(response))

})

app.post('/nodes/register', function (req, res) {
    var nodes = req.body.nodes
    nodes.forEach(function(element){
        myBC.register_node(element)
    })

    mes = {
        'message': "New nodes have been added",
        'total_nodes': myBC.nodes.length
    }

    res.send(JSON.stringify(mes))
})

app.get('/nodes/resolve', function (req, res) {
    replaced = myBC.resolve_conflicts()
    
    if(replaced){
        response = {
            'message': 'Our chain was replaced',
            'new_chain': myBC.chain
        }
    } else {
        response = {
            'message': 'Our chain is authoritative',
            'chain': myBC.chain
        }
    }

    res.send(JSON.stringify(response))

})


app.listen(port, () => console.log('Example app listening on port ' + port))
