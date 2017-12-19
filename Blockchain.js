var port = process.env.port || 3001;

var sha256 = require("sha256")
var bodyParser = require('body-parser')
const express = require('express')
const app = express()
const aSyncRequest = require('request');
var request = require('sync-request');

app.use(bodyParser.json())

class Blockchain {
    constructor() {
        this.chain = []
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
        var current_index = 1

        while (current_index < chain.length) {

            var block = chain[current_index]
            if (block.previous_hash != this.hash_block(last_block)) {
                return false
            }

            if (!this.valid_proof(last_block.proof, block.proof)) {
                return false
            }
            last_block = block
            current_index += 1
        }
        return true
    }

    resolve_conflicts() {
        console.log("1")
        var max_length = this.chain.length
        var myBlockChain = this
        var changed = false
        var new_chain
        this.nodes.forEach(function (element) {
            console.log("why: " + element + '/chain')
            var res = request('GET', element + '/chain')
            console.log("2")
            if (res.statusCode == 200) {
                var blockchain = JSON.parse(res.getBody().toString('utf8'))
                var length = blockchain.length
                var chain = blockchain.chain

                var y = myBlockChain.valid_chain(chain)

                if (length > max_length && myBlockChain.valid_chain(chain)) {
                    max_length = length
                    new_chain = chain
                    changed = true
                    console.log("am i here?")
                }
            }

            console.log("testing")
        })

        console.log("what are you? " + changed)
        if (changed) {
            console.log("am i ehere2?")
            this.chain = new_chain

            console.log("calling: " + JSON.stringify(this.nodes))
            this.nodes.forEach(function (element) {
                aSyncRequest(element + '/nodes/resolve', function (error, response, body) {
                    console.log("--------start--------")
                    console.log('error:', error); // Print the error if one occurred
                    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                    console.log('body:', body); // Print the HTML for the Google homepage.
                    console.log("--------done--------")
                });
            })
            return true
        }
        return false
    }

    hash_block(block) {
        return sha256(JSON.stringify(block))
    }
}

var myBC = new Blockchain()

//var res = request('GET', 'http://localhost:3001/chain')

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

app.get('/createGenesis', function (req, res) {
    var block = {
        'index': 0,
        'timestamp': new Date().toLocaleString,
        'transactions': "empty",
        'proof': "proof",
        'previous_hash': "Genesis"
    }

    myBC.chain.push(block)

    res.send("Genesis added")

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
    nodes.forEach(function (element) {
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

    if (replaced) {
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
