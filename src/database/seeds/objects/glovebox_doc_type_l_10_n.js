const { gloveboxDocTypes } = require('./gloveboxDocTypesData');

const seeds = gloveboxDocTypes.reduce((acc, type) => {
  Object.keys(type.langs).forEach((lang) => {
    const langData = type.langs[lang];
    acc.push({
      id: `${type.id}-${lang}`,
      doc_type_id: type.id,
      lang,
      name: langData.name,
      description: langData.description || null,
      document_number_label: langData.documentNumberLabel || null,
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
