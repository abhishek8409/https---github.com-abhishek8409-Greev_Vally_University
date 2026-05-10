

const teacherForm = document.getElementById("teacherForm");

teacherForm.addEventListener("submit", async function(e){

    e.preventDefault();

    const teacherData = {

        name: document.getElementById("name").value,

        subject: document.getElementById("subject").value,

        mobile: document.getElementById("mobile").value,

        email: document.getElementById("email").value,

        qualification: document.getElementById("qualification").value

    };

    const response = await fetch('/add-teacher', {

        method:'POST',

        headers:{
            'Content-Type':'application/json'
        },

        body:JSON.stringify(teacherData)

    });

    const result = await response.json();

    alert(result.message);

    teacherForm.reset();

    loadTeachers();

    loadTeacherCount();

});


// Load Teachers

async function loadTeachers(){

    const response = await fetch('/teachers');

    const teachers = await response.json();

    let output = "";

    teachers.forEach((teacher)=>{

        output += `

        <tr>

            <td>${teacher.name}</td>

            <td>${teacher.subject}</td>

            <td>${teacher.mobile}</td>

            <td>${teacher.email}</td>

            <td>${teacher.qualification}</td>

            <td>

                <button class="deleteBtn"
                onclick="deleteTeacher('${teacher._id}')">

                Delete

                </button>

            </td>

        </tr>

        `;

    });

    document.getElementById("teacherTable")
    .innerHTML = output;

}


// Teacher Count

async function loadTeacherCount(){

    const response = await fetch('/teacher-count');

    const data = await response.json();

    document.getElementById("teacherCount")
    .innerText = data.totalTeachers;

}


// Delete Teacher

async function deleteTeacher(id){

    const response = await fetch('/delete-teacher/' + id, {

        method:'DELETE'

    });

    const result = await response.json();

    alert(result.message);

    loadTeachers();

    loadTeacherCount();

}

loadTeachers();

loadTeacherCount();
