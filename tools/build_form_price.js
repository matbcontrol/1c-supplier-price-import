// Генерирует Form.xml формы обработки «Загрузка прайса поставщика».
// Запуск: node tools/build_form_price.js src/ЗагрузкаПрайсаПоставщика/Forms/Форма/Ext/Form.xml
const fs = require('fs');

let id = 0;
const next = () => ++id;
const ru = (t) => `<v8:item><v8:lang>ru</v8:lang><v8:content>${t}</v8:content></v8:item>`;
const title = (t) => `<Title>${ru(t)}</Title>`;
const cm = (n) => `<ContextMenu name="${n}КонтекстноеМеню" id="${next()}"/>`;
const tip = (n) => `<ExtendedTooltip name="${n}РасширеннаяПодсказка" id="${next()}"/>`;
const events = (list) => (list && list.length ? `<Events>${list.map(([e, h]) => `<Event name="${e}">${h}</Event>`).join('')}</Events>` : '');

function input(name, path, o = {}) {
  const p = [`<DataPath>${path}</DataPath>`];
  if (o.readOnly) p.push('<ReadOnly>true</ReadOnly>');
  if (o.caption) p.push(title(o.caption));
  if (o.titleLoc) p.push(`<TitleLocation>${o.titleLoc}</TitleLocation>`);
  if (o.width) p.push(`<Width>${o.width}</Width>`);
  if (o.height) p.push(`<Height>${o.height}</Height>`);
  if (o.multiLine) p.push('<MultiLine>true</MultiLine>');
  if (o.choiceButton) p.push('<ChoiceButton>true</ChoiceButton>');
  if (o.listChoice) p.push('<ListChoiceMode>true</ListChoiceMode>');
  if (o.noEdit) p.push('<TextEdit>false</TextEdit>');
  if (o.hint) p.push(`<InputHint>${ru(o.hint)}</InputHint>`);
  return `<InputField name="${name}" id="${next()}">${p.join('')}${cm(name)}${tip(name)}${events(o.events)}</InputField>`;
}

function checkbox(name, path, o = {}) {
  const p = [`<DataPath>${path}</DataPath>`];
  if (o.caption) p.push(title(o.caption));
  p.push(`<TitleLocation>${o.titleLoc || 'Right'}</TitleLocation>`);
  p.push('<CheckBoxType>Auto</CheckBoxType>');
  return `<CheckBoxField name="${name}" id="${next()}">${p.join('')}${cm(name)}${tip(name)}${events(o.events)}</CheckBoxField>`;
}

function group(name, caption, kind, children, o = {}) {
  return `<UsualGroup name="${name}" id="${next()}">${title(caption)}<Group>${kind}</Group><Representation>${o.repr || 'None'}</Representation><ShowTitle>${o.showTitle ? 'true' : 'false'}</ShowTitle>${tip(name)}<ChildItems>${children.join('')}</ChildItems></UsualGroup>`;
}

function addition(tableName, kind, suffix) {
  const n = tableName + suffix;
  const type = kind === 'SearchStringAddition' ? 'SearchStringRepresentation' : kind === 'ViewStatusAddition' ? 'ViewStatusRepresentation' : 'SearchControl';
  return `<${kind} name="${n}" id="${next()}"><AdditionSource><Item>${tableName}</Item><Type>${type}</Type></AdditionSource>${cm(n)}${tip(n)}</${kind}>`;
}

function table(name, columns) {
  const head = `<Table name="${name}" id="${next()}"><Representation>List</Representation><ChangeRowSet>false</ChangeRowSet><ChangeRowOrder>false</ChangeRowOrder><DataPath>${name}</DataPath>`;
  const parts = [cm(name), `<AutoCommandBar name="${name}КоманднаяПанель" id="${next()}"/>`, tip(name),
    addition(name, 'SearchStringAddition', 'СтрокаПоиска'),
    addition(name, 'ViewStatusAddition', 'СостояниеПросмотра'),
    addition(name, 'SearchControlAddition', 'УправлениеПоиском')];
  return head + parts.join('') + `<ChildItems>${columns.join('')}</ChildItems></Table>`;
}

function button(name, command, isDefault) {
  return `<Button name="${name}" id="${next()}"><Type>CommandBarButton</Type>${isDefault ? '<DefaultButton>true</DefaultButton>' : ''}<CommandName>${command}</CommandName>${tip(name)}</Button>`;
}

// Типы.
const str = (len = 0) => `<v8:Type>xs:string</v8:Type><v8:StringQualifiers><v8:Length>${len}</v8:Length><v8:AllowedLength>Variable</v8:AllowedLength></v8:StringQualifiers>`;
const num = (d, f, sign = 'Any') => `<v8:Type>xs:decimal</v8:Type><v8:NumberQualifiers><v8:Digits>${d}</v8:Digits><v8:FractionDigits>${f}</v8:FractionDigits><v8:AllowedSign>${sign}</v8:AllowedSign></v8:NumberQualifiers>`;
const bool = () => '<v8:Type>xs:boolean</v8:Type>';
const date = () => '<v8:Type>xs:dateTime</v8:Type><v8:DateQualifiers><v8:DateFractions>Date</v8:DateFractions></v8:DateQualifiers>';
const ref = (t) => `<v8:Type>cfg:${t}</v8:Type>`;

let attrId = 0;
const attr = (name, caption, type, extra = '') => `<Attribute name="${name}" id="${++attrId}">${caption ? title(caption) : ''}<Type>${type}</Type>${extra}</Attribute>`;

// Колонки таблицы позиций: совпадают с НоваяТаблицаПозиций() в модуле объекта.
const columns = [
  ['Применить', bool()], ['НомерСтрокиФайла', num(10, 0, 'Nonnegative')], ['Статус', str(20)], ['Ключ', str(150)],
  ['КодПоставщика', str(150)], ['Артикул', str(150)], ['Штрихкод', str(150)], ['Наименование', str(250)], ['Единица', str(150)],
  ['Категория', str(150)], ['ТекстЦены', str(150)], ['Цена', num(15, 2)], ['РРЦ', num(15, 2)],
  ['Номенклатура', ref('CatalogRef.Номенклатура')], ['КакНайден', str(30)], ['ЕстьСоответствие', bool()],
  ['ЕдиницаИзмерения', ref('CatalogRef.КлассификаторЕдиницИзмерения')], ['ЕдиницаТовара', ref('CatalogRef.КлассификаторЕдиницИзмерения')],
  ['НужнаХарактеристика', bool()], ['ГруппаТовара', ref('CatalogRef.Номенклатура')], ['ЦенаБыло', num(15, 2)], ['ДатаЦеныБыло', date()],
  ['ЦенаИзменение', num(10, 1)], ['ИзменитсяЦена', bool()], ['РРЦБыло', num(15, 2)], ['РРЦИзменение', num(10, 1)], ['ИзменитсяРРЦ', bool()],
  ['ЕстьОшибка', bool()], ['Комментарий', str(500)], ['Результат', str(300)],
];
let colId = 0;
const columnsXml = columns.map(([n, t]) => `<Column name="${n}" id="${++colId}"><Type>${t}</Type></Column>`).join('');

const ro = (n, cap, w) => input('Позиции' + n, 'Позиции.' + n, { readOnly: true, caption: cap, width: w });
const tableColumns = [
  checkbox('ПозицииПрименить', 'Позиции.Применить', { caption: 'Загрузить', titleLoc: 'None' }),
  ro('НомерСтрокиФайла', 'Стр.', 3),
  ro('Статус', 'Статус', 13),
  ro('КодПоставщика', 'Код', 9),
  ro('Наименование', 'Наименование в прайсе', 22),
  ro('Номенклатура', 'Товар в базе', 17),
  ro('КакНайден', 'Найден по', 10),
  ro('ЦенаБыло', 'Цена была', 6),
  ro('Цена', 'Цена', 6),
  ro('ЦенаИзменение', '%', 4),
  ro('РРЦБыло', 'РРЦ была', 6),
  ro('РРЦ', 'РРЦ', 6),
  ro('РРЦИзменение', '% РРЦ', 4),
  ro('Комментарий', 'Комментарий', 30),
];

const colFields = [['КодПоставщика', 'Код'], ['Артикул', 'Артикул'], ['Штрихкод', 'Штрихкод'], ['Наименование', 'Наименование'],
  ['Единица', 'Ед.'], ['Цена', 'Цена'], ['РРЦ', 'РРЦ'], ['Категория', 'Категория']]
  .map(([f, cap]) => input('Колонка' + f, 'Колонка' + f, { caption: cap, width: 3, events: [['OnChange', 'КолонкаПриИзменении']] }));

const onParam = [['OnChange', 'ПараметрПриИзменении']];
const items = [
  group('ГруппаФайл', 'Файл', 'AlwaysHorizontal', [
    input('Поставщик', 'Поставщик', { width: 22, events: [['OnChange', 'ПоставщикПриИзменении']] }),
    input('ИмяФайла', 'ИмяФайла', { width: 34, choiceButton: true, noEdit: true, hint: 'xlsx, xls, ods или csv', events: [['StartChoice', 'ИмяФайлаНачалоВыбора']] }),
    input('ДатаПрайса', 'ДатаПрайса', { width: 10, events: onParam }),
  ]),
  group('ГруппаЧтоЗагружать', 'Что загружать', 'Vertical', [
    group('ГруппаЦеныПоставщика', 'Цены поставщика', 'AlwaysHorizontal', [
      checkbox('ЗаписыватьЦеныПоставщика', 'ЗаписыватьЦеныПоставщика', { events: onParam }),
      input('ВидЦенПоставщика', 'ВидЦенПоставщика', { titleLoc: 'None', width: 26, hint: 'вид цен поставщика', events: onParam }),
    ]),
    group('ГруппаРРЦ', 'РРЦ', 'AlwaysHorizontal', [
      checkbox('ЗаписыватьРРЦ', 'ЗаписыватьРРЦ', { events: onParam }),
      input('ВидЦенРРЦ', 'ВидЦенРРЦ', { titleLoc: 'None', width: 26, events: onParam }),
    ]),
    group('ГруппаКонтроль', 'Контроль', 'AlwaysHorizontal', [
      input('ПорогИзменения', 'ПорогИзменения', { width: 4, events: onParam }),
      checkbox('СоздаватьНовыеТовары', 'СоздаватьНовыеТовары', { events: onParam }),
      input('ГруппаДляНовых', 'ГруппаДляНовых', { width: 24, hint: 'как у соседей по прайсу', events: onParam }),
    ]),
  ], { showTitle: true, repr: 'WeakSeparation' }),
  group('ГруппаКолонки', 'Колонки файла (номер колонки, 0 - нет)', 'AlwaysHorizontal', colFields, { showTitle: true, repr: 'WeakSeparation' }),
  input('Сводка', 'Сводка', { readOnly: true, titleLoc: 'None', multiLine: true, height: 3 }),
  group('ГруппаОтбор', 'Отбор', 'AlwaysHorizontal', [
    input('Показать', 'Показать', { width: 18, listChoice: true, events: [['OnChange', 'ПоказатьПриИзменении']] }),
  ]),
  table('Позиции', tableColumns),
];

const commandBar = `<AutoCommandBar name="ФормаКоманднаяПанель" id="-1"><HorizontalAlign>Left</HorizontalAlign><ChildItems>${
  button('ФормаЗагрузить', 'Form.Command.Загрузить', true)}${button('ФормаПеречитать', 'Form.Command.Перечитать', false)}</ChildItems></AutoCommandBar>`;

const attributes = [
  attr('Объект', '', ref('ExternalDataProcessorObject.ЗагрузкаПрайсаПоставщика'), '<MainAttribute>true</MainAttribute>'),
  attr('Поставщик', 'Поставщик', ref('CatalogRef.Контрагенты')),
  attr('ИмяФайла', 'Прайс', str()),
  attr('АдресСтрок', '', str()),
  attr('ДатаПрайса', 'Дата прайса', date()),
  attr('ЗаписыватьЦеныПоставщика', 'Цена из прайса → цены поставщика', bool()),
  attr('ВидЦенПоставщика', 'Вид цен поставщика', ref('CatalogRef.ВидыЦенКонтрагентов')),
  attr('ЗаписыватьРРЦ', 'РРЦ из прайса → наши цены', bool()),
  attr('ВидЦенРРЦ', 'Вид цен для РРЦ', ref('CatalogRef.ВидыЦен')),
  attr('ПорогИзменения', 'Подтверждать изменение цены больше, %', num(3, 0, 'Nonnegative')),
  attr('СоздаватьНовыеТовары', 'Создавать новые товары', bool()),
  attr('ГруппаДляНовых', 'в группе', ref('CatalogRef.Номенклатура')),
  ...['КодПоставщика', 'Артикул', 'Штрихкод', 'Наименование', 'Единица', 'Цена', 'РРЦ', 'Категория'].map((f) => attr('Колонка' + f, '', num(3, 0, 'Nonnegative'))),
  attr('Сводка', '', str()),
  attr('Показать', 'Показать', str(20)),
  attr('ЗагрузкаВыполнена', '', bool()),
  `<Attribute name="Позиции" id="${++attrId}">${title('Позиции прайса')}<Type><v8:Type>v8:ValueTable</v8:Type></Type><Columns>${columnsXml}</Columns></Attribute>`,
];

let cmdId = 0;
const command = (name, caption, action, tooltip) => `<Command name="${name}" id="${++cmdId}">${title(caption)}<ToolTip>${ru(tooltip)}</ToolTip><Action>${action}</Action><CurrentRowUse>DontUse</CurrentRowUse></Command>`;

const ns = 'xmlns="http://v8.1c.ru/8.3/xcf/logform" xmlns:app="http://v8.1c.ru/8.2/managed-application/core" xmlns:cfg="http://v8.1c.ru/8.1/data/enterprise/current-config" xmlns:dcscor="http://v8.1c.ru/8.1/data-composition-system/core" xmlns:dcssch="http://v8.1c.ru/8.1/data-composition-system/schema" xmlns:dcsset="http://v8.1c.ru/8.1/data-composition-system/settings" xmlns:ent="http://v8.1c.ru/8.1/data/enterprise" xmlns:lf="http://v8.1c.ru/8.2/managed-application/logform" xmlns:pal="http://v8.1c.ru/8.1/data/ui/colors/palette" xmlns:style="http://v8.1c.ru/8.1/data/ui/style" xmlns:sys="http://v8.1c.ru/8.1/data/ui/fonts/system" xmlns:v8="http://v8.1c.ru/8.1/data/core" xmlns:v8ui="http://v8.1c.ru/8.1/data/ui" xmlns:web="http://v8.1c.ru/8.1/data/ui/colors/web" xmlns:win="http://v8.1c.ru/8.1/data/ui/colors/windows" xmlns:xr="http://v8.1c.ru/8.3/xcf/readable" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.21"';

const xml = `﻿<?xml version="1.0" encoding="UTF-8"?>
<Form ${ns}>
${title('Загрузка прайса поставщика')}
<WindowOpeningMode>LockOwner</WindowOpeningMode>
<AutoTitle>false</AutoTitle>
<Group>Vertical</Group>
<CommandBarLocation>Top</CommandBarLocation>
${commandBar}
${events([['OnOpen', 'ПриОткрытии'], ['OnCreateAtServer', 'ПриСозданииНаСервере']])}
<ChildItems>${items.join('\n')}</ChildItems>
<Attributes>${attributes.join('\n')}</Attributes>
<Commands>${command('Загрузить', 'Загрузить', 'Загрузить', 'Создать новые товары, запомнить соответствия и записать цены одной транзакцией')}
${command('Перечитать', 'Перечитать прайс', 'Перечитать', 'Заново прочитать файл и сверить с базой')}</Commands>
</Form>
`;
fs.writeFileSync(process.argv[2], xml, 'utf8');
console.log('written', process.argv[2], 'ids', id);
