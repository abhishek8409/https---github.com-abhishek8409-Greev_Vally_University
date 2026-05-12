const feeForm = document.getElementById("feeForm");

feeForm.addEventListener("submit", async function(e){

    e.preventDefault();

    const data = {

        studentName:
        document.getElementById("studentName").value,

        studentId:
        document.getElementById("studentId").value,

        course:
        document.getElementById("course").value,

        totalFee:
        document.getElementById("totalFee").value,

        paidFee:
        document.getElementById("paidFee").value

    };

    const response = await fetch('/add-fee', {

        method:'POST',

        headers:{
            'Content-Type':'application/json'
        },

        body:JSON.stringify(data)

    });

    const result = await response.json();

    alert(result.message);

    feeForm.reset();

    loadFees();

    loadCollection();

});


// Load Fees

async function loadFees(){

    const response = await fetch('/fees');

    const fees = await response.json();

    let output = "";

    fees.forEach((fee)=>{

        output += `

        <tr>

            <td>${fee.studentName}</td>

            <td>${fee.studentId}</td>

            <td>${fee.course}</td>

            <td>₹${fee.totalFee}</td>

            <td>₹${fee.paidFee}</td>

            <td>₹${fee.remainingFee}</td>

            <td>

                <button onclick="deleteFee('${fee._id}')">
                    Delete
                </button>

            </td>

        </tr>

        `;

    });

    document.getElementById("feeTable")
    .innerHTML = output;

}


// Total Collection

async function loadCollection(){

    const response = await fetch('/fees-total');

    const data = await response.json();

    document.getElementById("totalCollection")
    .innerText = data.total;

}


// Delete Fee

async function deleteFee(id){

    await fetch('/delete-fee/' + id, {

        method:'DELETE'

    });

    loadFees();

    loadCollection();

}

loadFees();

loadCollection();
