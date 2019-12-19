
var mysql = require('mysql');
var inquirer = require('inquirer');
var Table = require('cli-table');

var connection = mysql.createConnection({
    host: '',
    user: 'root',
    password: 'password',
    database: 'bamazon'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connection successful');
   
    displayItems();
});

var chosenItem = {};


var resetCart = function() {
    chosenItem = {};
}

var displayItems = function() {
    connection.query(`SELECT * FROM products`, (err, res) => {
        var listTable = new Table({
            head: ['Item ID', 'Product Name', 'Price'],
            colWidths: [10, 45, 12]
        });

        for (var i = 0; i < res.length; i++) {
            listTable.push([res[i].item_id, res[i].product_name, `$${res[i].price}`]);
        }
        
        console.log(`\n\n${listTable.toString()}\n\n`);
        askForID();
    });
};


var askForID = function() {
    inquirer.prompt({
        name: 'itemID',
        type: 'input',
        message: 'Enter the ID of the item you would like to purchase:',
        //  input is number from 1-10
        validate: (value) => {
            if (!isNaN(value) && (value > 0 && value <= 10)) {
                return true;
            } else {
                console.log((' => Please enter a number from 1-10'));
                return false;
            }
        }
   
    }).then((answer) => {
        connection.query('SELECT item_id, product_name, price, stock_quantity, product_sales FROM products WHERE ?', { item_id: answer.itemID }, (err, res) => {
            confirmItem(res[0].product_name, res);
        });
    });
};


var confirmItem = function(product, object) {
    inquirer.prompt({
        name: 'confirmItem',
        type: 'confirm',
        message: `You chose` + (` '${product}'. `) + `Is this correct?`
    }).then((answer) => {
        if (answer.confirmItem) {
            chosenItem = {
                item_id: object[0].item_id,
                product_name: object[0].product_name,
                price: object[0].price,
                stock_quantity: object[0].stock_quantity,
                product_sales: object[0].product_sales
            };
          
            askHowMany(chosenItem.item_id);
        } else {
            askForID();
        }
    });
};

var askHowMany = function(chosenID) {
    inquirer.prompt({
        name: 'howMany',
        type: 'input',
        message: 'How many would you like to purchase?',
        validate: (value) => {
            if (!isNaN(value) && value > 0) {
                return true;
            } else {
                console.log((' =>please enter a number greater than 0'));
                return false;
            }
        }
    }).then((answer) => {
        connection.query('SELECT stock_quantity FROM products WHERE ?', { item_id: chosenItem.item_id }, (err, res) => {
           
            if (res[0].stock_quantity < answer.howMany) {
                console.log(('\n\tSorry, insufficient quantity in stock!\n'));
                
                inquirer.prompt({
                    name: 'proceed',
                    type: 'confirm',
                    message: 'Would you still like to purchase this product?'
                }).then((answer) => {
                    if (answer.proceed) {
                        askHowMany(chosenItem.item_id);
                    } else {
                        console.log(('\n\tThanks for visiting! We hope to see you again soon.\n'));
                        connection.end();
                    }
                });
            
            } else {
                chosenItem.howMany = answer.howMany;
                console.log(('\n\tOrder processing...'));
                
                connection.query('UPDATE products SET ? WHERE ?', [
                    {
                        stock_quantity: chosenItem.stock_quantity - answer.howMany,
                        product_sales: chosenItem.product_sales + (chosenItem.price * answer.howMany)
                    },
                    {
                        item_id: chosenItem.item_id
                    }
                ], (err, res) => {
                    console.log((`\n\tOrder confirmed!!! Your total was $${(chosenItem.price * chosenItem.howMany).toFixed(2)}.\n`));
                    promptNewPurchase();
                });
            }
        });
    });
}

var promptNewPurchase = function() {
    inquirer.prompt({
        name: 'newPurchase',
        type: 'confirm',
        message: 'Would you like to make another purchase?'
    }).then((answer) => {
        if (answer.newPurchase) {
            resetCart();
            askForID();
        } else {
            console.log(('\n\tWe appreciate your business. Have a great day!\n'));
            connection.end();
        }
    });
};