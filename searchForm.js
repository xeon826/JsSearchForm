import {MDCList} from '@material/list';
import {MDCRipple} from '@material/ripple';
import {MDCCheckbox} from '@material/checkbox';
require('xlsx');
require('file-saverjs');
import {TableExport} from 'tableexport';
// ajax search form
class SearchForm {
  constructor(container) {
    if (!$(container).find('.form-ajax').length)
      return;
    this.form = $(container).find('.form-ajax');
    this.container = container;
    const list = new MDCList(this.container.querySelector('.mdc-list'));
    const listItemRipples = list.listElements.map((listItemEl) => new MDCRipple(listItemEl));
    this.container.querySelectorAll('.mdc-list-item.has-checkbox')
      .forEach(list_item => this.listCheckBox(list_item));
    this.input = container.querySelectorAll('input:not(.no-auto-populate)');
    this.input.forEach(input => this.attachInputEvent(input));
    this.select = container.querySelectorAll('select:not(.no-auto-populate)');
    this.select.forEach(select => this.attachChangeEvent(select));
    this.advancedSearchContainer = document.getElementById('advanced-search-container');
    this.autoRefreshButton = this.container.querySelector('#auto-refresh');
    this.autoRefresh = '';
    this.checkBoxEvents();
    this.makeNoteOfScrollTop();
    this.pagination();
    this.orderByEvents();
    this.bulkAction();
    this.setTableExport();
    this.autoRefreshEvents();
    this.autoRefreshInterval = 5000;
  }

  autoRefreshEvents() {
    let button = this.container.querySelector('#auto-refresh');
    $('body').click((e) => {
      if (e.target != button)
        $(button).removeClass('active');
    })
    button.addEventListener('click', (e) => {
      e.target.classList.toggle('active');
      let autoRefresh = setInterval(() => {
        if (button.classList.contains('active')) {
          this.populate();
        } else {
          clearInterval(autoRefresh);
        }
      }, this.autoRefreshInterval);
      if (button.classList.contains('active'))
        openSnackbar(`Table is set to automatically refresh every ${this.autoRefreshInterval/1000} seconds.`);
      else
        openSnackbar(`Auto-refresh has been turned off.`);
    })
  }

  bulkAction() {
    let buttons = this.container.querySelectorAll('.bulk-action');
    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        let originalText = button.innerHTML;
        $(button).load('/image/loading.svg');
        event.stopPropagation();
        event.preventDefault();
        var search = this.populate();
        let inputs = this.container.querySelectorAll(`.${event.target.getAttribute('data-input-class')}`);
        search.done(() => {
          inputs.forEach((input) => {
            input.value = '';
            button.innerHTML = originalText;
          })
        })
      })
    })
  }

  orderByEvents() {
    let triggers = this.container.querySelectorAll('.order-by-column');
    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        let id = trigger.getAttribute('data-field'),
          input = document.getElementById(`orderBy${id}`);
        switch (input.value) {
          case '':
            input.value = 'asc';
            break;
          case 'asc':
            input.value = 'desc';
            break;
          case 'desc':
            input.value = '';
            break;
        }
        this.populate();
      })
    })
  }

  makeNoteOfScrollTop() {
    $('.tbl-content').on('scroll', function() {
      $('#table-scrolltop').val($('.tbl-content').scrollTop());
    });
  }

  restoreScrollTop() {
    var table = document.getElementById('table'),
      table_scrolltop = document.getElementById('table-scrolltop').value;
    table.scrollTop = table_scrolltop;
  }

  checkBoxEvents() {
    let rowCheckBoxes = document.querySelectorAll('.row-check');
    rowCheckBoxes.forEach((checkBox) => {
      checkBox.addEventListener('input', (e) => {
        $(e.target).parents('tr').toggleClass('active');
        let itsAMasterCheckBox = e.target.classList.contains('mdc-checkbox__native-control--master');
        if (itsAMasterCheckBox) {
          let isChecked = e.target.checked;
          rowCheckBoxes.forEach((checkbox) => {
            checkbox.checked = isChecked;
            if (isChecked)
              $(checkbox).parents('tr').addClass('active');
            else
              $(checkbox).parents('tr').removeClass('active');
          })
        }
      })
    })
  }

  pagination() {
    var $paginationNav = this.container.querySelector('.pagination-nav');
    $paginationNav.addEventListener('click', (event) => {
      var $target = event.target,
        classList = $target.classList,
        // currentPage = parseInt(this.container.querySelector('.page-item.active').firstElementChild.getAttribute('data-page')),
        currentPage = parseInt(document.getElementById('page').value),
        nextPage = currentPage + 1,
        prevPage = currentPage - 1,
        $pageInput = this.container.querySelector('#page');
      if (classList.contains('page')) {
        event.stopPropagation();
        event.preventDefault();
        $pageInput.value = $target.getAttribute('data-value');
        this.populate();
      }
    }, false);
    $paginationNav.addEventListener('change', (event) => {
      this.populate();
    }, false);
  }

  setTableExport() {
    this.table = document.getElementById("ajax-table");
    this.tableExport = TableExport(this.table, {
      headers: true, // (Boolean), display table headers (th or td elements) in the <thead>, (default: true)
      footers: true, // (Boolean), display table footers (th or td elements) in the <tfoot>, (default: false)
      formats: ["xlsx", "csv", "txt", "xls"], // (String[]), filetype(s) for the export, (default: ['xlsx', 'csv', 'txt'])
      filename: "id", // (id, String), filename for the downloaded file, (default: 'id')
      bootstrap: true, // (Boolean), style buttons using bootstrap, (default: true)
      exportButtons: false, // (Boolean), automatically generate the built-in export buttons for each of the specified formats (default: true)
      position: "top", // (top, bottom), position of the caption element relative to table, (default: 'bottom')
      ignoreRows: null, // (Number, Number[]), row indices to exclude from the exported file(s) (default: null)
      ignoreCols: 2, // (Number, Number[]), column indices to exclude from the exported file(s) (default: null)
      trimWhitespace: true, // (Boolean), remove all leading/trailing newlines, spaces, and tabs from cell text in the exported file(s) (default: false)
      RTL: false, // (Boolean), set direction of the worksheet to right-to-left (default: false)
      sheetname: "id" // (id, String), sheet name for the exported spreadsheet, (default: 'id')
    });
  }

  attachChangeEvent(select) {
    select.addEventListener('change', () => {
      this.populate();
    });
  }

  attachInputEvent(input) {
    var notRowCheck = !input.classList.contains('row-check'),
      notMasterCheck = !input.classList.contains('mdc-checkbox__native-control--master');
    if (notRowCheck && notMasterCheck) {
      input.addEventListener('input', () => {
        this.populate();
      });
    }
  }

  populate(maintainScrolltop = false) {
    var formData = this.form.getData(),
      search = $.get(this.form.attr('action'), formData + '&form_submitted=1', 'text');
    search.done((data) => {
      if (formData == this.form.getData()) {
        $('.table-container').html(data);
        this.makeNoteOfScrollTop();
        if (maintainScrolltop)
          this.restoreScrollTop();
        this.setTableExport();
        this.pagination();
        this.checkBoxEvents();
        this.orderByEvents();
        console.log('populate');
        this.container.querySelectorAll('.tbl-content .has-affixed-menu')
          .forEach(button => new AffixMenu(button));
      }
    })
    return search;
  }

  listCheckBox(list_item) {
    var check_box = new MDCCheckbox(list_item.querySelector('.mdc-checkbox'));
    list_item.addEventListener('click', (event) => {
      event.stopPropagation();
      check_box.checked = !check_box.checked;
      this.populate();
    })
  }
}
module.exports = SearchForm;
//const SearchForm = new SearchForm();
//export { SearchForm };
