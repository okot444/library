'use strict';
const React = require('react');
const ReactDOM = require('react-dom');
const when = require('when');
const client = require('./client');

const follow = require('./follow'); // function to hop multiple links by "rel"

const root = '/api';

class App extends React.Component {

	constructor(props) {
    		super(props);
    		this.state = {books: [], attributes: [],  page: 1, pageSize: 20, links: {} , loggedInManager: this.props.loggedInManager};
    		this.updatePageSize = this.updatePageSize.bind(this);
    		this.onCreate = this.onCreate.bind(this);
    		this.onDelete = this.onDelete.bind(this);
    		this.onNavigate = this.onNavigate.bind(this);
			this.onUpdate = this.onUpdate.bind(this);
    	}


	loadFromServer(pageSize) {
    	follow(client, root, [
    		{rel: 'books', params: {size: pageSize}}]
    	).then(bookCollection => {
    		return client({
    			method: 'GET',
    			path: bookCollection.entity._links.profile.href,
    			headers: {'Accept': 'application/schema+json'}
    		}).then(schema => {
                    this.schema = schema.entity;
                    this.links = bookCollection.entity._links;
                    return bookCollection;
            	});
    			this.schema = schema.entity;
				this.links = bookCollection.entity._links;
    			return bookCollection;
    		});
    	}).then(bookCollection => {
			this.page = bookCollection.entity.page;
			return bookCollection.entity._embedded.books.map(bookCollection =>
				client({
					method: 'GET',
					path: bookCollection._links.self.href
			}));
		}).then(bookCollectionPromises => {
			return when.all(bookCollectionPromises);
		}).done(books => {
    		this.setState({
				page: this.page,
    			books: books,
    			attributes: Object.keys(this.schema.properties),
    			pageSize: pageSize,
    			links: this.links
			});
    	});
		/*.done(bookCollection => {
    		this.setState({
    			books: bookCollection.entity._embedded.books,
    			attributes: Object.keys(this.schema.properties),
    			pageSize: pageSize,
    			links: bookCollection.entity._links});
    	});*/
    }

	onUpdate(bookCollection, updatedbookCollection) {
		/*client({
			method: 'PUT',
			path: bookCollection.entity._links.self.href,
			entity: updatedbookCollection,
			headers: {
				'Content-Type': 'application/json',
				'If-Match': bookCollection.headers.Etag
			}
		})*/
		if(bookCollection.entity.manager.name === this.state.loggedInManager) {
        			updatedbookCollection["manager"] = bookCollection.entity.manager;
        			client({
        				method: 'PUT',
        				path: bookCollection.entity._links.self.href,
        				entity: updatedbookCollection,
        				headers: {
        					'Content-Type': 'application/json',
        					'If-Match': bookCollection.headers.Etag
        				}
        	    }).done(response => {
			//this.loadFromServer(this.state.pageSize);
		}, response => {
			if (response.status.code === 403) {
            					alert('ACCESS DENIED: You are not authorized to update ' +
            						bookCollection.entity._links.self.href);
            				}
			if (response.status.code === 412) {
				alert('DENIED: Unable to update ' + bookCollection.entity._links.self.href + '. Your copy is stale.');
			} else {
              			alert("You are not authorized to update");
              		}
		    });
	    }
	}

	onCreate(newbookCollection) {
		const self = this;
		follow(client, root, ['books'])
		.done(response => {
			return client({
				method: 'POST',
				path: response.entity._links.self.href,
				entity: newbookCollection,
				headers: {'Content-Type': 'application/json'}
			})
		})/*.then(response => {
			return follow(client, root, [{rel: 'books', params: {'size': self.state.pageSize}}]);
		}).done(response => {
			if (typeof response.entity._links.last !== "undefined") {
				this.onNavigate(response.entity._links.last.href);
			} else {
				this.onNavigate(response.entity._links.self.href);
			}
		});*/
	}
    // tag::delete[]
    	onDelete(bookCollection) {
    		client({method: 'DELETE', path: bookCollection.entity._links.self.href}
            		).done(response => {/* let the websocket handle updating the UI */},
            		response => {
            			if (response.status.code === 403) {
            				alert('ACCESS DENIED: You are not authorized to delete ' +
            					bookCollection.entity._links.self.href);
            			}
            		});
        }
    	// end::delete[]

    // tag::navigate[]
    	onNavigate(navUri) {
    		client({
    		        method: 'GET',
    		        path: navUri
    		}).then(bookCollection => {
				this.links = bookCollection.entity._links;
				this.page = bookCollection.entity.page;

				return bookCollection.entity._embedded.books.map(bookCollection =>
					client({
						method: 'GET',
						path: bookCollection._links.self.href

					})
				);
			}).then(bookCollectionPromises => {
				return when.all(bookCollectionPromises);
			}).done(books => {
    			this.setState({
					page: this.page,
    				books: books,
    				attributes: Object.keys(this.schema.properties),
    				pageSize: this.state.pageSize,
    				links: this.links
    			});
    		});
    	}
    	// end::navigate[]

    // tag::update-page-size[]
    	updatePageSize(pageSize) {
    		if (pageSize !== this.state.pageSize) {
    			this.loadFromServer(pageSize);
    		}
    	}
    // end::update-page-size[]




	/*componentDidMount() {
		client({method: 'GET', path: '/api/books'}).done(response => {
			this.setState({books: response.entity._embedded.books});
		});
	}*/

	componentDidMount() {
    	this.loadFromServer(this.state.pageSize);
		stompClient.register([
			{route: '/topic/newbookCollection', callback: this.refreshAndGoToLastPage},
			{route: '/topic/updatebookCollection', callback: this.refreshCurrentPage},
			{route: '/topic/deletebookCollection', callback: this.refreshCurrentPage}
		]);
    }

	refreshAndGoToLastPage(message) {
		follow(client, root, [{
			rel: 'books',
			params: {size: this.state.pageSize}
		}]).done(response => {
			if (response.entity._links.last !== undefined) {
				this.onNavigate(response.entity._links.last.href);
			} else {
				this.onNavigate(response.entity._links.self.href);
			}
		})
	}

	refreshCurrentPage(message) {
		follow(client, root, [{
			rel: 'books',
			params: {
				size: this.state.pageSize,
				page: this.state.page.number
			}
		}]).then(bookCollection => {
			this.links = bookCollection.entity._links;
			this.page = bookCollection.entity.page;

			return bookCollection.entity._embedded.books.map(bookCollection => {
				return client({
					method: 'GET',
					path: bookCollection._links.self.href
				})
			});
		}).then(bookCollectionPromises => {
			return when.all(bookCollectionPromises);
		}).then(books => {
			this.setState({
				page: this.page,
				books: books,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}

	render() {
		return (
			<div>
            	<CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
            	<bookCollectionList
							page={this.state.page}
							books={this.state.books}
            				links={this.state.links}
            				pageSize={this.state.pageSize}
							attributes={this.state.attributes}
            				onNavigate={this.onNavigate}
            				onDelete={this.onDelete}
							onUpdate={this.onUpdate}
            				updatePageSize={this.updatePageSize}
            				loggedInManager={this.state.loggedInManager}/>
            </div>
		)
	}
}




class UpdateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		const updatedbookCollection = {};
		this.props.attributes.forEach(attribute => {
			updatedbookCollection[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onUpdate(this.props.bookCollection, updatedbookCollection);
		window.location = "#";
	}

	render() {
		const inputs = this.props.attributes.map(attribute =>
			<p key={this.props.bookCollection.entity[attribute]}>
				<input type="text" placeholder={attribute}
					   defaultValue={this.props.bookCollection.entity[attribute]}
					   ref={attribute} className="field"/>
			</p>
		);

		const dialogId = "updatebookCollection-" + this.props.bookCollection.entity._links.self.href;
		const isManagerCorrect = this.props.bookCollection.entity.manager.name == this.props.loggedInManager;
        const mymanager = this.props.bookCollection.entity.manager.name;
        const loginManager = this.props.loggedInManager;

		if (isManagerCorrect === false) {
        			return (
        					<div>
        						<p> Разрешено для {mymanager} </p>
        					</div>
        				)
        		} else {
                        return (
                            <div>
                                <a href={"#" + dialogId}>Update</a>
                                <div id={dialogId} className="modalDialog">
                                    <div>
                                        <a href="#" title="Close" className="close">X</a>

                                        <h2>Update a bookCollection</h2>

                                        <form>
                                            {inputs}
                                            <button onClick={this.handleSubmit}>Update</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )
                  }
	}

};

// tag::create-dialog[]
class CreateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		const newbookCollection = {};
		this.props.attributes.forEach(attribute => {
			newbookCollection[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onCreate(newbookCollection);

		// clear out the dialog's inputs
		this.props.attributes.forEach(attribute => {
			ReactDOM.findDOMNode(this.refs[attribute]).value = '';
		});

		// Navigate away from the dialog to hide it.
		window.location = "#";
	}

	render() {
		const inputs = this.props.attributes.map(attribute =>
			<p key={attribute}>
				<input type="text" placeholder={attribute} ref={attribute} className="field"/>
			</p>
		);

		return (
			<div>
				<a href="#createbookCollection" className="bookCollectionCrButton">Create bookCollection</a>

				<div id="createbookCollection" className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Create new bookCollection</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Create</button>
						</form>
					</div>
				</div>
			</div>
		)
	}

}
// end::create-dialog[]


class bookCollectionList extends React.Component {

	constructor(props) {
		super(props);
		this.handleNavFirst = this.handleNavFirst.bind(this);
		this.handleNavPrev = this.handleNavPrev.bind(this);
		this.handleNavNext = this.handleNavNext.bind(this);
		this.handleNavLast = this.handleNavLast.bind(this);
		this.handleInput = this.handleInput.bind(this);
	}

	// tag::handle-page-size-updates[]
	handleInput(e) {
		e.preventDefault();
		const pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
		if (/^[0-9]+$/.test(pageSize)) {
			this.props.updatePageSize(pageSize);
		} else {
			ReactDOM.findDOMNode(this.refs.pageSize).value = pageSize.substring(0, pageSize.length - 1);
		}
	}
	// end::handle-page-size-updates[]

	// tag::handle-nav[]
	handleNavFirst(e){
		e.preventDefault();
		this.props.onNavigate(this.props.links.first.href);
	}

	handleNavPrev(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.prev.href);
	}

	handleNavNext(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.next.href);
	}

	handleNavLast(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.last.href);
	}
	// end::handle-nav[]

	// tag::bookCollection-list-render[]
	render() {
		const pageInfo = this.props.page.hasOwnProperty("number") ?
			<h3>books - Page {this.props.page.number + 1} of {this.props.page.totalPages}</h3> : null;
		const books = this.props.books.map(bookCollection =>
			<bookCollection key={bookCollection.entity._links.self.href}
            		  bookCollection={bookCollection}
            		  attributes={this.props.attributes}
            		  onUpdate={this.props.onUpdate}
            		  onDelete={this.props.onDelete}
            		  loggedInManager={this.props.loggedInManager}/>
            		);

		const navLinks = [];
		if ("first" in this.props.links) {
			navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
		}
		if ("prev" in this.props.links) {
			navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
		}
		if ("next" in this.props.links) {
			navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
		}
		if ("last" in this.props.links) {
			navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
		}


		return (
			<div>
				<input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Description</th>
							<th></th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{books}
					</tbody>
				</table>
				<div>
					{navLinks}
				</div>
			</div>
		)
	}
	// end::bookCollection-list-render[]
}

// tag::bookCollection[]
class bookCollection extends React.Component {

	constructor(props) {
		super(props);
		this.handleDelete = this.handleDelete.bind(this);
	}

	handleDelete() {
		this.props.onDelete(this.props.bookCollection);
	}

	render() {
		return (
			<tr>
				<td>{this.props.bookCollection.entity.name}</td>
				<td>{this.props.bookCollection.entity.description}</td>
				<td>
					<UpdateDialog bookCollection = {this.props.bookCollection}
								  attributes = {this.props.attributes}
							      onUpdate={this.props.onUpdate}/>
				</td>
				<td>
					<button onClick={this.handleDelete}>Delete</button>
				</td>
			</tr>
		)
	}
}
// end::bookCollection[]


// tag::render[]
ReactDOM.render(
	<App loggedInManager={document.getElementById('managername').innerHTML}/>,
	document.getElementById('react')
)
// end::render[]
