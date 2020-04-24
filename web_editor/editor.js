var application = {
    currentDocument: null,
    classAttribute: 'classes'
};

application.setDocument = function(doc) {
    this.currentDocument = doc;

    const pagesCount = doc.querySelectorAll('PageBreak').length;
    document.getElementById('pageselect').innerHTML 
        = [...Array(pagesCount).keys()].map(x => `<option>${x + 1}</option>`).join('');

    this.prepareClasses();

    this.setClassesForm();
    this.setPage(1);
}

application.getElementsOfPage = function(n) {
    const elements = this.currentDocument.querySelectorAll('Document > *');

    var out = [];

    for (var i = 0; i < elements.length; i++) {
        if (elements[i].matches('PageBreak'))  {
            n--;
            continue;
        }

        if (n == 0) {
            out.push(elements[i]);
        } else if (n < 0) {
            break;
        }
    }

    return out;
}

application.prepareClasses = function() {
    var that = this;

    if (!that.currentDocument.querySelector('Document > Metadata')) {
        that.currentDocument.querySelector('Document')
            .prepend(new DOMParser().parseFromString('<Metadata />', 'application/xml').children[0]); 
    }

    if (!that.currentDocument.querySelector('Document > Metadata > Classes')) {
        that.currentDocument.querySelector('Document > Metadata').
            appendChild(new DOMParser().parseFromString('<Classes />', 'application/xml').children[0]); 
    }

    var added = [];

    that.currentDocument.querySelectorAll(`Annotation[key=${that.classAttribute}`)
        .forEach(a => {
            const c = new DOMParser().parseFromString('<Class />', 'application/xml').children[0]; 
            const className = a.attributes.value.value;
            if (!className) return;
            if (added.includes(className)) return;

            c.setAttribute('name', a.attributes.value.value);
            c.setAttribute('type', a.parentElement.parentElement.tagName);
            c.setAttribute('color', '#000000');

            that.currentDocument.querySelector(`Metadata > Classes`).appendChild(c);
            added.push(className);
        });
}

application.setPage = function(n) {
    if (n == undefined) n = parseInt(document.getElementById('pageselect').value);

    var that = this;
    const pagesCount = this.currentDocument.querySelectorAll('PageBreak').length;

    if (n < 1) {
        this.setPage(1);
        return;
    }
    if (n > pagesCount) {
        this.setPage(pagesCount);
        return;
    }

    [...document.querySelectorAll('#pageselect option').values()]
        .forEach(y => {
           if (parseInt(y.innerText) == n) {
               y.setAttribute('selected', 'selected');
           } else {
               y.removeAttribute('selected');
           }
        });
    document.getElementById('pageselect').value = n;

    const elements = this.getElementsOfPage(n);
    application.setForm(elements);

    const imagestr = this.currentDocument.querySelectorAll('PageBreak')[n-1].attributes.filename.value;
    this.imageEl = new Image();
    const imageFile = [...document.getElementById('imagedir').files]
        .find(x => x.name == imagestr);

    if (imageFile) {
        this.imageEl.onload = function() {
            that.drawPage(elements);
        };
        this.imageEl.src = URL.createObjectURL(imageFile);
    } else {
        this.imageEl = undefined;
        this.drawPage(elements);
    }
}

application.setForm = function(elements) {
    var that = this;

    const spaceClasses = that.classNames('VerticalSpace');
    const textClasses = that.classNames('TextLine');

    function selectFormEl(x) {
        const ann = x.querySelector(`Annotations > Annotation[key="${that.classAttribute}"]`);
        
        var current = undefined;
        if (ann) {
            current = ann.attributes.value.value;
        }

        var classes;
        if (x.matches('VerticalSpace')) {
            classes = spaceClasses;
        } else if (x.matches('TextLine')) {
            classes = textClasses;
        } else {
            return null;
        }


        return `<select>` + ['-'].concat(classes).map(x => x == current ? `<option selected>${x}</option>` : `<option>${x}</option>`).join('') + `</select>`;
    }

    const newTableHTML = elements.map(x => {
        const form = selectFormEl(x);

        const xmlid = x.querySelector('Annotation[key="id"]').attributes.value.value;
        if (x.matches('VerticalSpace')) {
            return `<tr class="vspace" data-xml-id="${xmlid}"><td>[VerticalSpace]</td><td>${form}</td></tr>`;
        } else if (x.matches('TextLine')) {
            var line = x.querySelector('TextEquiv').textContent;
            line = line == '' ? '[Leerzeile]' : line;

            return `<tr class="textline" data-xml-id="${xmlid}"><td>${line}</td><td>${form}</td></tr>`;
        } else {
            const name = x.nodeName;
            return `<tr class="other" data-xml-id="${xmlid}"><td>[${name}]</td></tr>`;
        }
    }).join('');

    document.querySelector('.items-table tbody').innerHTML = newTableHTML;
    document.querySelectorAll('.items-table select').forEach(el => that.updateElementClass(el));

    document.querySelectorAll('.items-table select').forEach(el => el.addEventListener('change', () => {
        that.updateElementClass(el);
        that.drawPage(elements, el.closest('tr').attributes['data-xml-id'].value);
    }));

    document.querySelectorAll('.items-table select').forEach(el => el.addEventListener('focus', () => {
        that.drawPage(elements, el.closest('tr').attributes['data-xml-id'].value);
    }));
}

application.drawPage = function(elements, selectedId) {
    var that = this;
    // TODO click handler?

    const canvas = document.getElementById('image-canvas');

    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    const imageEl = this.imageEl;
    var scale = Math.min(canvas.width / imageEl.width, 
        canvas.height / imageEl.height);
    ctx.scale(scale, scale);
    ctx.drawImage(imageEl, 0, 0);

    elements.forEach(x => drawElem(x, ctx));

    function drawElem(e, ctx) {
        const idStr = e.querySelector('Annotation[key="id"]').attributes.value.value;
        const selected = idStr == selectedId;

        var classStr;
        if (e.querySelector(`Annotation[key="${that.classAttribute}"]`)) {
            classStr = e.querySelector(`Annotation[key="${that.classAttribute}"]`).attributes.value.value;
        }

        if (e.matches('TextLine')) {
            const coordStr = e.querySelector('Annotation[key="pos"]').attributes.value.value;
            const nums = coordStr.split(/[, ]/).map(x => parseInt(x));

            if (!selected) {
                ctx.strokeStyle = '#008800';
                ctx.lineWidth = 1;
                ctx.globalAlpha = classStr ? .2 : .01;
                ctx.fillStyle = classStr ? that.getClass(classStr).color : '#000000';
            } else {
                ctx.strokeStyle = '#008800';
                ctx.lineWidth = 2;
                ctx.globalAlpha = classStr ? .4 : .10;
                ctx.fillStyle = classStr ? that.getClass(classStr).color : '#000000';
            }
            ctx.fillRect(nums[0], nums[1], nums[2]-nums[0], nums[3]-nums[1]);
            ctx.globalAlpha = 1;
            ctx.strokeRect(nums[0], nums[1], nums[2]-nums[0], nums[3]-nums[1]);
        } else if (e.matches('VerticalSpace')) {
            const coordStr = e.querySelector('Annotation[key="pos"]').attributes.value.value;
            const nums = coordStr.split(/[, ]/).map(x => parseInt(x));

            if (!selected) {
                ctx.strokeStyle = '#ee4444';
                ctx.lineWidth = 1;
            } else {
                ctx.strokeStyle = '#ee0000';
                ctx.lineWidth = 2;
            }
            ctx.beginPath();
            ctx.moveTo(nums[0], nums[1]);
            ctx.lineTo(nums[2], nums[3]);
            ctx.stroke();

            if (classStr) {
                ctx.fillStyle = that.getClass(classStr).color;
                ctx.beginPath();
                ctx.moveTo(nums[2], nums[3]);
                ctx.lineTo(nums[2] - 30, nums[3] - 14);
                ctx.lineTo(nums[2] - 30, nums[3] + 14);
                ctx.closePath();
                ctx.fill();

            }
        }
    }
}

application.classNames = function(type) {
    var that = this;

    var classNames = [...this.currentDocument.querySelectorAll('Metadata > Classes > Class')]
            .filter(c => type == undefined || c.attributes.type.value == type)
            .map(c => c.attributes.name.value);

    return classNames;
}

application.getClass = function(name) {
    const c = this.currentDocument.querySelector(`Metadata > Classes > Class[name="${name}"`);

    const type = c.attributes.type.value;
    const color = c.attributes.color.value;

    return {type: type, color: color};
}



application.setClassesForm = function() {
    var that = this;

    const classLine = function(name) {
        const color = that.getClass(name).color;
        const type = that.getClass(name).type;
        return `<tr name="${name}">
            <td><input type="color" value="${color}"></td>
            <td><input type="text" value="${name}"></td>
            <td><select class="type-select"><option ${type=='TextLine'?'selected':''} value="TextLine">Line</option><option value="VerticalSpace" ${type=='VerticalSpace'?'selected':''}>Space</option></select></td>
            <td><select class="task-select"><option>Tasks</option><option>Apply to all</option><option>Apply to all on this page</option><option>Apply to all on this and following pages</option><option>Delete</option></td>
        </tr>
        `;

    };

    formStr = '<tbody>';
    formStr += that.classNames().map(classLine).join('');
    formStr += `<tr>
            <td><input type="color"></td>
            <td><input type="text"></td>
            <td><select class="type-select"><option value="TextLine" selected>Line</option><option value="VerticalSpace">Space</option></select></td>
            <td><button class="add-class">Add</button></td>
        </tr>
        `;

    formStr += '</tbody>';

    document.querySelector('#classes-menu').innerHTML = formStr;
    document.querySelector('#classes-menu').querySelectorAll('tr:not(:last-child) input, tr:not(:last-child) select.type-select').forEach(i => i.addEventListener('change', () => {
        that.updateClass(i.parentElement.parentElement);
        that.setClassesForm();
        that.setPage();
    }));

    document.querySelector('#classes-menu').querySelector('.add-class').addEventListener('click', () => {
        const form = document.querySelector('#classes-menu tr:last-child');
        const name = form.querySelector('input[type="text"]').value;
        const color = form.querySelector('input[type="color"]').value;
        const type = form.querySelector('select.type-select').value;

        const c = new DOMParser().parseFromString('<Class />', 'application/xml').children[0]; 
        c.setAttribute('name', name);
        c.setAttribute('color', color);
        c.setAttribute('type', type);

        that.currentDocument.querySelector(`Metadata > Classes`).appendChild(c);
        that.setClassesForm();
        that.setPage();
    });

    document.querySelector('#classes-menu').querySelectorAll('select.task-select').forEach(i => i.addEventListener('change', () => {
        const pagesCount = that.currentDocument.querySelectorAll('PageBreak').length;
        const page = parseInt(document.getElementById('pageselect').value);
        const name = i.parentElement.parentElement.getAttribute('name');
        const type = i.parentElement.parentElement.querySelector('select.type-select').value;
        if (i.value == 'Delete') {
            that.deleteClass(name);
            that.setClassesForm();
            that.setPage();
        } else if (i.value == 'Apply to all') {
            [...Array(pagesCount).keys()].map(n => n+1)
                .map(n => that.getElementsOfPage(n))
                .flat()
                .filter(xmlEl => xmlEl.matches(type))
                .forEach(xmlEl => that.setElementClass(xmlEl, name));

            that.setPage();
        } else if (i.value == 'Apply to all on this page') {
            that.getElementsOfPage(page)
                .filter(xmlEl => xmlEl.matches(type))
                .forEach(xmlEl => that.setElementClass(xmlEl, name));

            that.setPage();
        } else if (i.value == 'Apply to all on this and following pages') {
            [...Array(pagesCount).keys()].map(n => n+1)
                .filter(n => n >= page)
                .map(n => that.getElementsOfPage(n))
                .flat()
                .filter(xmlEl => xmlEl.matches(type))
                .forEach(xmlEl => that.setElementClass(xmlEl, name));

            that.setPage();
        }

        i.selectedIndex = 0;

    }));
}

application.updateClass = function(form) {
    var that = this;

    const oldname = form.getAttribute('name');
    const name = form.querySelector('input[type="text"]').value;
    const color = form.querySelector('input[type="color"]').value;
    const type = form.querySelector('select.type-select').value;

    const c = this.currentDocument.querySelector(`Metadata > Classes > Class[name="${oldname}"`);
    c.setAttribute('name', name);
    c.setAttribute('color', color);
    c.setAttribute('type', type);

    // propagate name change
    this.currentDocument.querySelectorAll('Document > *').forEach(x => {
        const ann = x.querySelector(`Annotations > Annotation[key="${that.classAttribute}"]`);
        if (ann == undefined) return;

        if (ann.attributes.value.value == oldname) {
            if (x.matches(type)) {
                ann.setAttribute('value', name);
            } else {
                ann.setAttribute('value', '');
            }
        }
    });
}

application.deleteClass = function(name) {
    var that = this;
    this.currentDocument.querySelector(`Metadata > Classes > Class[name="${name}"`).remove();
    this.currentDocument.querySelectorAll('Document > *').forEach(x => {
        const ann = x.querySelector(`Annotations > Annotation[key="${that.classAttribute}"]`);
        if (ann == undefined) return;

        if (ann.attributes.value.value == name) {
            ann.setAttribute('value', '');
        }
    });

}

application.updateElementClass = function(el) {
    const val = el.value;
    var color = undefined;
    if (val == '-') {
        el.closest('tr').style = '';
    } else {
        color = color || this.getClass(val).color;

        el.closest('tr').style = `color: ${color}`;
    }

    const id = el.closest('tr').attributes['data-xml-id'].value;
    const xmlEl = this.currentDocument.querySelector(`Annotation[key="id"][value="${id}"]`).parentElement.parentElement;
    const name = val == '-' ? '' : val;

    this.setElementClass(xmlEl, name);
}

application.setElementClass = function(xmlEl, name) {
    var classAnnotation = xmlEl.querySelector(`Annotation[key="${this.classAttribute}"]`);
    if (!classAnnotation && name) {
        classAnnotation = new DOMParser().parseFromString('<Annotation />', 'application/xml').children[0];
        classAnnotation.setAttribute('key', this.classAttribute);
        xmlEl.querySelector('Annotations').appendChild(classAnnotation);
    }

    if (classAnnotation) classAnnotation.setAttribute('value', name);
}

application.saveFile = function(filename) {
    const serializer = new XMLSerializer();
    var sXML = serializer.serializeToString(this.currentDocument);

    var blob = new Blob([sXML], { type: 'text/plain' });

    function download(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', URL.createObjectURL(blob));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    download(filename, sXML);
}



document.getElementById('xmlinput').addEventListener('change', function() {
    const parser = new DOMParser();
    const reader = new FileReader();
    reader.onload = function(e) {
        const xmlDoc = parser.parseFromString(reader.result, 'text/xml');
        application.setDocument(xmlDoc);
    }

    if (this.files.length > 0) {
        reader.readAsText(this.files[0]);
    }
});

document.getElementById('imagedir').addEventListener('change', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page);
});

document.getElementById('prevpage').addEventListener('click', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page - 1);
});

document.getElementById('nextpage').addEventListener('click', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page + 1);
});

document.getElementById('pageselect').addEventListener('change', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page);
});

document.getElementById('save').addEventListener('click', function() {
    var file = document.getElementById('xmlinput').files[0];
    application.saveFile(file.name);
});

document.getElementById('edit-classes').addEventListener('click', function() {
    document.getElementById('classes-menu').classList.toggle('hidden');
});
